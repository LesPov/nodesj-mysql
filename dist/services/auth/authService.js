"use strict";
// authService.ts
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
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
const validatePassword = (user, password) => __awaiter(void 0, void 0, void 0, function* () {
    if (password.length === 8) {
        return password === user.verification.randomPassword;
    }
    else {
        return yield bcryptjs_1.default.compare(password, user.password);
    }
});
exports.validatePassword = validatePassword;
