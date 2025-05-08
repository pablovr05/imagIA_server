const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const VerificationCodes = sequelize.define('VerificationCode', {
    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true
    },
    user_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'Users',
            key: 'id'
        },
        onDelete: 'CASCADE'
    },
    phone: {
        type: DataTypes.STRING(15),
        allowNull: false
    },
    code: {
        type: DataTypes.STRING(6),
        allowNull: false
    },
}, {
    timestamps: true,
    tableName: 'VerificationCodes',
    underscored: true
});

module.exports = VerificationCodes;
