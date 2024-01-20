"use strict";
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
exports.loginUser = void 0;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const authModel_1 = require("../../../models/authModel");
const messages_1 = require("../../../middleware/messages");
const authUtils_1 = require("../../../utils/authUtils");
const MAX_LOGIN_ATTEMPTS = 5;
const getUserByUsername = (username) => __awaiter(void 0, void 0, void 0, function* () {
    return yield authModel_1.Auth.findOne({
        where: { username: username },
        include: ['verification'], // Cambiado para evitar la carga innecesaria de todos los atributos
    });
});
const handleUnverifiedUser = (res) => {
    return res.status(400).json({ msg: messages_1.errorMessages.userNotVerified });
};
const handleLockedAccount = (username, res) => __awaiter(void 0, void 0, void 0, function* () {
    yield (0, authUtils_1.lockAccount)(username);
    return res.status(400).json({ msg: messages_1.errorMessages.accountLocked });
});
const handleIncorrectPassword = (user, res) => __awaiter(void 0, void 0, void 0, function* () {
    const updatedLoginAttempts = (user.verification.loginAttempts || 0) + 1;
    yield user.verification.update({ loginAttempts: updatedLoginAttempts });
    if (updatedLoginAttempts >= MAX_LOGIN_ATTEMPTS) {
        return handleLockedAccount(user.username, res);
    }
    return res.status(400).json({ msg: messages_1.errorMessages.incorrectPassword(updatedLoginAttempts) });
});
const handleSuccessfulLogin = (user, res, password) => {
    return res.json({
        msg: password.length === 8 ? 'Inicio de sesión Recuperación de contraseña' : messages_1.successMessages.userLoggedIn,
        token: generateAuthToken(user),
        userId: user.id,
        rol: user.rol,
        passwordorrandomPassword: password.length === 8 ? 'randomPassword' : undefined,
    });
};
const generateAuthToken = (user) => {
    return jsonwebtoken_1.default.sign({
        username: user.username,
        rol: user.rol,
        userId: user.id
    }, process.env.SECRET_KEY || 'pepito123');
};
const loginUser = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { username, passwordorrandomPassword } = req.body;
    try {
        const user = yield getUserByUsername(username);
        if (!user) {
            return res.status(400).json({ msg: messages_1.errorMessages.userNotExists(username) });
        }
        if (!user.verification.isEmailVerified) {
            return handleUnverifiedUser(res);
        }
        if (!user.verification.isPhoneVerified) {
            return res.status(400).json({ msg: messages_1.errorMessages.phoneVerificationRequired });
        }
        if (user.loginAttempts >= MAX_LOGIN_ATTEMPTS) {
            const timeLeft = handleBlockExpiration(user, res);
            if (timeLeft !== undefined) {
                return res.status(400).json({
                    msg: `La cuenta está bloqueada temporalmente debido a múltiples intentos fallidos. Inténtalo de nuevo más tarde. Tiempo restante: ${timeLeft} minutos`,
                });
            }
        }
        const passwordValid = yield validatePassword(user, passwordorrandomPassword);
        if (!passwordValid) {
            return handleIncorrectPassword(user, res);
        }
        yield user.verification.update({ loginAttempts: 0 });
        const timeLeft = handleBlockExpiration(user, res);
        if (timeLeft !== undefined) {
            return res.status(400).json({
                msg: `La cuenta está bloqueada temporalmente debido a múltiples intentos fallidos. Inténtalo de nuevo más tarde. Tiempo restante: ${timeLeft} minutos`,
            });
        }
        return handleSuccessfulLogin(user, res, passwordorrandomPassword);
    }
    catch (error) {
        res.status(500).json({ msg: messages_1.errorMessages.databaseError, error });
    }
});
exports.loginUser = loginUser;
const handleBlockExpiration = (user, res) => {
    const currentDate = new Date();
    if (user.verification.blockExpiration && user.verification.blockExpiration > currentDate) {
        return Math.ceil((user.verification.blockExpiration.getTime() - currentDate.getTime()) / (60 * 1000));
    }
    return undefined;
};
const validatePassword = (user, password) => __awaiter(void 0, void 0, void 0, function* () {
    if (password.length === 8) {
        return password === user.verification.randomPassword;
    }
    else {
        return yield bcryptjs_1.default.compare(password, user.password);
    }
});
