const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const User = sequelize.define('User', {
    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true
    },
    phone: {
        type: DataTypes.STRING(15),
        allowNull: false,
        unique: true
    },
    nickname: {
        type: DataTypes.STRING(50),
        allowNull: false,
        unique: true
    },
    email: {
        type: DataTypes.STRING(100),
        allowNull: false,
        unique: true
    },
    type_id: {
        type: DataTypes.STRING(100),
        allowNull: false
    },
    remainingQuote: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    password: {
        type: DataTypes.STRING(20),
        allowNull: false,
        unique: false
    },
    token: {
        type: DataTypes.STRING(100),
        allowNull: true,
        unique: false
    },
}, {
    timestamps: true,
    tableName: 'Users',
    underscored: true
});

module.exports = User;
