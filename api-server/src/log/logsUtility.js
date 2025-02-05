const Logs = require('../models/Logs');

class logsUtility {
    static createLog(type, category, prompt) {
        const newLog = Logs.create({
            type: type,
            category: category,
            prompt: prompt,
            creted_at: new Date(),
            updated_at: new Date(),
        });
    }
}