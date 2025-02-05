const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Logs = sequelize.define('Logs', {
    type: {
        type: DataTypes.STRING(50),
        allowNull: false
    },
    Category: {
        type: DataTypes.STRING(50),
        allowNull: false
    },
    prompt: {
        type: DataTypes.TEXT,
        allowNull: false
    },
}, {
    timestamps: true,
    tableName: 'Logs',
    underscored: true
});

module.exports = Logs;
 