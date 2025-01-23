const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const User = sequelize.define('Users', {
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
    typeId: {
        type: DataTypes.STRING(100),
        allowNull: false
    }
}, {
    timestamps: true,
    tableName: 'Users',
    underscored: true
});

module.exports = User;
