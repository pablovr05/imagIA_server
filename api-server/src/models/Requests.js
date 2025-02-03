const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Request = sequelize.define('Request', {
    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true
    },
    userId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'Users',
            key: 'id'
        },
        onDelete: 'CASCADE'
    },
    prompt: {
        type: DataTypes.TEXT,
        allowNull: false
    },
    answer: {
        type: DataTypes.TEXT,
        allowNull: false
    },
    model: {
        type: DataTypes.STRING(50),
        allowNull: false
    },
}, {
    timestamps: true,
    tableName: 'Requests',
    underscored: true
});

module.exports = Request;
 