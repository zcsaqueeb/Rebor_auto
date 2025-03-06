const fs = require('fs');
const axios = require('axios');
const userAgents = require('./userAgents');

console.log("====================================");
console.log("         WELCOME AUTO BOT!          ");
console.log("       Name:     LASKAR-BOT         ");
console.log("====================================");

const config = JSON.parse(fs.readFileSync('config.json', 'utf-8'));
const TASK_IDS = config.taskIds;
const DELAY = config.delayBetweenRequests;
const PROFILE_URL = config.apiEndpoints.profile;
const TASK_URL = config.apiEndpoints.task;

const tokens = fs.readFileSync('tokens.txt', 'utf-8')
    .split('\n')
    .map(t => t.trim())
    .filter(t => t);

const totalTokens = tokens.length;

async function mainProcess() {
    console.log(`🔍 Found ${totalTokens} accounts to process.\n`);
    console.log("🔄 Starting the auto-login and daily task claim process...\n");

    let accountIndex = 0;
    for (const token of tokens) {
        accountIndex++;
        console.log(`🔄 Processing account ${accountIndex} of ${totalTokens}...\n`);
        await loginAndClaimTasks(token);
    }

    console.log("✅ Process complete! All tokens have been processed.\n");
}

async function loginAndClaimTasks(token) {
    try {
        const randomUserAgent = userAgents[Math.floor(Math.random() * userAgents.length)];

        let retryCount = 0;
        const maxRetries = 5;

        while (retryCount < maxRetries) {
            try {
                const profileResponse = await axios.get(PROFILE_URL, {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'User-Agent': randomUserAgent,
                        'Accept': 'application/json, text/plain, */*'
                    }
                });

                if (profileResponse.data.status !== "success") {
                    console.log("❌ Your token is invalid.\n");
                    return;
                }

                const user = profileResponse.data.user;
                console.log(`✅ Login successful! Username: ${user.username}, Coin: ${user.coin}, User-Agent: ${randomUserAgent}\n`);

                for (const taskId of TASK_IDS) {
                    const taskPayload = {
                        telegramId: user.telegramId,
                        taskId: taskId,
                        type: "daily",
                        action: "complete"
                    };

                    console.log(`🔄 Claiming ${taskId === 1 ? "Daily Check-In" : `task ${taskId}`} for ${user.username}...`);

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
                                console.log(`🎉 Task ${taskId} claimed successfully! Reward: ${taskResponse.data.reward}, Total Coin: ${taskResponse.data.totalCoins}\n`);
                                success = true;
                            } else {
                                console.log(`⚠️ Failed to claim task ${taskId} for ${user.username}. Response:`, taskResponse.data);
                                success = true;
                            }
                        } catch (taskError) {
                            if (taskError.response) {
                                if (taskError.response.status === 400) {
                                    console.log(`✅ Task ${taskId} already claimed.\n`);
                                    success = true;
                                } else if (taskError.response.status === 429) {
                                    const retryAfter = parseInt(taskError.response.data.retryAfter, 10) || 60;
                                    console.log(`⏳ Too many requests. Waiting ${retryAfter} seconds before retrying...`);
                                    await new Promise(resolve => setTimeout(resolve, retryAfter * 1000));
                                } else {
                                    console.log(`❌ Error claiming task ${taskId} for ${user.username}. Status: ${taskError.response.status}, Response:`, taskError.response.data);
                                    success = true;
                                }
                            } else {
                                console.log(`❌ Error claiming task ${taskId} for ${user.username}:`, taskError.message);
                                success = true;
                            }
                        }
                    }

                    await new Promise(resolve => setTimeout(resolve, DELAY));
                }
                return;
            } catch (error) {
                if (error.response && error.response.status === 429) {
                    const retryAfter = parseInt(error.response.data.retryAfter, 10) || 60;
                    console.log(`⏳ Too many requests. Waiting ${retryAfter} seconds before retrying...`);

                    retryCount++;
                    if (retryCount >= maxRetries) {
                        console.log("⚠️ This account has been rate-limited for too long. Skipping this account...\n");
                        return;
                    }

                    await new Promise(resolve => setTimeout(resolve, retryAfter * 1000));
                } else if (error.response && error.response.status === 403) {
                    console.log("❌ Your token is invalid.\n");
                    return;
                } else {
                    console.log(`❌ Error logging in with token: ${token}`, error.message);
                    return;
                }
            }
        }
    } catch (error) {
        console.log(`❌ Error logging in with token: ${token}`, error.message);
    }
}

// Schedule script to run every 24 hours
setInterval(async () => {
    console.log("🔄 Restarting process after 24 hours...\n");
    await mainProcess();
}, 24 * 60 * 60 * 1000); // 24 hours in milliseconds

// Run immediately on script start
mainProcess();
