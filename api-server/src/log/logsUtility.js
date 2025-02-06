const Logs = require('../models/Logs');

class logsUtility {
    static async createLog(type, category, prompt) {
        await Logs.create({
            type: type,
            category: category,
            prompt: prompt,
            created_at: new Date(),
            updated_at: new Date(),
        });
    }
}

module.exports = logsUtility;
