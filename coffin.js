const fs = require('fs');
const axios = require('axios');
const chalk = require('chalk');
const cliProgress = require('cli-progress');

// Load userAgents
const userAgents = require('./userAgents'); // Ensure this file exists in the same directory

// Load configuration from config.json
const config = require('./config.json');

const TASK_IDS = config.taskIds;
const DELAY = config.delayBetweenRequests; // Delay in milliseconds
const PROFILE_URL = config.apiEndpoints.profile;
const TASK_URL = config.apiEndpoints.task;

// Function to run the main process
async function runProcess() {
    console.log(chalk.yellow('🔄 Starting the auto login process and claiming all daily tasks...\n'));

    const tokens = fs.readFileSync('tokens.txt', 'utf-8')
        .split('\n')
        .map(t => t.trim())
        .filter(t => t);

    const totalTokens = tokens.length;
    console.log(chalk.yellow(`🔍 Found ${totalTokens} accounts to process.\n`));

    const progressBar = new cliProgress.SingleBar({}, cliProgress.Presets.shades_classic);
    progressBar.start(totalTokens, 0);

    let accountIndex = 0;
    for (const token of tokens) {
        accountIndex++;
        console.log(chalk.yellow(`🔄 Processing account ${accountIndex} of ${totalTokens}...\n`));
        await loginAndClaimTasks(token);
        progressBar.update(accountIndex);
    }

    progressBar.stop();
    console.log(chalk.green('✅ Process completed! All tokens have been processed.'));
}

// Schedule the script to run every 8 hours
setInterval(runProcess, 8 * 60 * 60 * 1000); // 8 hours in milliseconds

// Initial run
runProcess();

async function loginAndClaimTasks(token) {
    try {
        const randomUserAgent = userAgents[Math.floor(Math.random() * userAgents.length)];

        let retryCount = 0;
        const maxRetries = 5; // Maximum retries for 429

        while (retryCount < maxRetries) {
            try {
                // Step 1: Get user data
                const profileResponse = await axios.get(PROFILE_URL, {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'User-Agent': randomUserAgent,
                        'Accept': 'application/json, text/plain, */*'
                    }
                });

                if (profileResponse.data.status !== 'success') {
                    console.log(chalk.red('❌ Your token is invalid\n'));
                    return;
                }

                const user = profileResponse.data.user;
                console.log(chalk.green(`✅ Successfully logged in! Username: ${user.username}, Coin: ${user.coin}, User-Agent: ${randomUserAgent}\n`));

                // Step 2: Loop through all task IDs and claim one by one
                for (const taskId of TASK_IDS) {
                    const taskPayload = {
                        telegramId: user.telegramId,
                        taskId: taskId,
                        type: 'daily',
                        action: 'complete'
                    };

                    console.log(chalk.yellow(`🔄 Claiming ${taskId === 1 ? 'Daily Check-In' : `task ${taskId}`} for ${user.username}...`));

                    let success = false;
                    while (!success) {
                        try {
                            const taskResponse = await axios.post(TASK_URL, taskPayload, {
                                headers: {
                                    'Authorization': `Bearer ${token}`,
                                    'User-Agent': randomUserAgent,
                                    'Accept': 'application/json, text/plain, */*',
                                    'Content-Type': 'application/json'
                                }
                            });

                            if (taskResponse.data.success) {
                                console.log(chalk.green(`🎉 Task ${taskId} successfully claimed! Reward: ${taskResponse.data.reward}, Total Coin: ${taskResponse.data.totalCoins}\n`));
                                success = true;
                            } else {
                                console.log(chalk.yellow(`⚠️ Failed to claim task ${taskId} for ${user.username}. Response:`, taskResponse.data));
                                success = true;
                            }
                        } catch (taskError) {
                            if (taskError.response) {
                                if (taskError.response.status === 400) {
                                    console.log(chalk.green(`✅ Task ${taskId} has already been claimed.\n`));
                                    success = true;
                                } else if (taskError.response.status === 429) {
                                    const retryAfter = parseInt(taskError.response.data.retryAfter, 10) || 60;
                                    console.log(chalk.yellow(`⏳ Too many requests. Waiting ${retryAfter} seconds before trying again...`));
                                    await new Promise(resolve => setTimeout(resolve, retryAfter * 1000));
                                } else {
                                    console.log(chalk.red(`❌ Error claiming task ${taskId} for ${user.username}. Status: ${taskError.response.status}, Response:`, taskError.response.data));
                                    success = true;
                                }
                            } else {
                                console.log(chalk.red(`❌ Error claiming task ${taskId} for ${user.username}:`, taskError.message));
                                success = true;
                            }
                        }
                    }

                    // Add delay to avoid rate limit
                    await new Promise(resolve => setTimeout(resolve, DELAY));
                }
                return;
            } catch (error) {
                if (error.response && error.response.status === 429) {
                    const retryAfter = parseInt(error.response.data.retryAfter, 10) || 60;
                    console.log(chalk.yellow(`⏳ Too many requests. Waiting ${retryAfter} seconds before trying again...`));

                    retryCount++;
                    if (retryCount >= maxRetries) {
                        console.log(chalk.yellow('⚠️ This account has been rate-limited for too long. Skipping this account...\n'));
                        return;
                    }

                    await new Promise(resolve => setTimeout(resolve, retryAfter * 1000));
                } else if (error.response && error.response.status === 403) {
                    console.log(chalk.red('❌ Your token is invalid\n'));
                    return;
                } else {
                    console.log(chalk.red(`❌ Error logging in with token: ${token}`, error.message));
                    return;
                }
            }
        }
    } catch (error) {
        console.log(chalk.red(`❌ Error logging in with token: ${token}`, error.message));
    }
}
