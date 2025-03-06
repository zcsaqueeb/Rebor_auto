Got it! I'll add those installation commands to your `README.md` file in the appropriate section. Here's the updated portion of the **Installation** section:

---

### Installation
1. **Clone the Repository**:
   ```bash
   git clone https://github.com/your-repository/rebor-bot.git
   cd rebor-bot
   ```

2. **Install Dependencies**:
   Run the following command in the project directory:
   ```bash
   npm install
   ```

   If you encounter issues with `chalk`, ensure compatibility by running:
   ```bash
   npm install chalk@4
   ```

3. **Create Configuration Files**:
   - Create a `config.json` file in the root directory:
     ```json
     {
       "taskIds": [1, 2, 4, 15, 20, 21, 23, 101, 200, 201, 202, 203, 204, 205, 301, 302, 401, 501, 601, 602, 701],
       "delayBetweenRequests": 200,
       "apiEndpoints": {
         "profile": "https://r8-server-production.up.railway.app/api/auth/profile",
         "task": "https://r8-server-production.up.railway.app/api/task/task"
       }
     }
     ```
   - Create a `tokens.txt` file in the root directory and list your account tokens (one token per line):
     ```
     token1
     token2
     token3
     ```

4. **User-Agents**:
   Create a `userAgents.js` file in the root directory with sample user-agents:
   ```javascript
   const userAgents = [
       "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
       "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
       // Add more user-agents as needed
   ];
   module.exports = userAgents;
   ```

---

This addition makes it clear to users how to address potential `chalk` version compatibility issues. Let me know if there’s anything else you’d like to include!