"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserProfile = void 0;
const sequelize_1 = require("sequelize");
const connection_1 = __importDefault(require("../database/connection"));
const authModel_1 = require("./authModel");
exports.UserProfile = connection_1.default.define('userProfile', {
    id: {
        type: sequelize_1.DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    },
    userId: {
        type: sequelize_1.DataTypes.INTEGER,
        allowNull: false,
        unique: true,
        references: {
            model: authModel_1.Auth,
            key: 'id',
        },
    },
    profilePicture: {
        type: sequelize_1.DataTypes.STRING,
        allowNull: true,
    },
    firstName: {
        type: sequelize_1.DataTypes.STRING,
        allowNull: false,
    },
    lastName: {
        type: sequelize_1.DataTypes.STRING,
        allowNull: false,
    },
    biography: {
        type: sequelize_1.DataTypes.TEXT,
        allowNull: true,
    },
    direccion: {
        type: sequelize_1.DataTypes.TEXT,
        allowNull: true,
    },
    profileType: {
        type: sequelize_1.DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
    },
    messageType: {
        type: sequelize_1.DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
    },
    status: {
        type: sequelize_1.DataTypes.ENUM('Activado', 'Desactivado'),
        allowNull: false,
        defaultValue: 'Activado', // Puedes establecer el valor predeterminado según tus necesidades
    },
});
// Relación entre Auth (usuario) y UserProfile (perfil de usuario)
authModel_1.Auth.hasOne(exports.UserProfile, { foreignKey: 'userId' });
exports.UserProfile.belongsTo(authModel_1.Auth, { foreignKey: 'userId' });
