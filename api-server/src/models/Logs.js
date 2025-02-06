const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Logs = sequelize.define('Logs', {
    type: {
        type: DataTypes.STRING(50),
        allowNull: false
    },
    category: {
        type: DataTypes.STRING(50),
        allowNull: false
    },
    prompt: {
        type: DataTypes.TEXT,
        allowNull: false
    },
    updated_at: {
        type: DataTypes.DATE,
        allowNull: false,
        unique: false
    },
    created_at: {
        type: DataTypes.DATE,
        allowNull: false,
        unique: false
    },
}, {
    timestamps: true,
    tableName: 'Logs',
    underscored: true
});

module.exports = Logs;
 