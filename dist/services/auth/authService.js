"use strict";
// authService.ts
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.validatePassword = exports.generateAuthToken = void 0;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const generateAuthToken = (user) => {
    return jsonwebtoken_1.default.sign({
        username: user.username,
        rol: user.rol,
        userId: user.id
    }, process.env.SECRET_KEY || 'pepito123');
};
exports.generateAuthToken = generateAuthToken;
const validatePassword = async (user, password) => {
    if (password.length === 8) {
        return password === user.verification.randomPassword;
    }
    else {
        return await bcryptjs_1.default.compare(password, user.password);
    }
};
exports.validatePassword = validatePassword;
