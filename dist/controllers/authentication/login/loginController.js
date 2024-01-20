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
const authModel_1 = require("../../../models/authModel");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const messages_1 = require("../../../middleware/messages");
const verificationModel_1 = require("../../../models/verificationModel");
const authUtils_1 = require("../../../utils/authUtils");
const MAX_LOGIN_ATTEMPTS = 5;
const loginUser = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { username, passwordorrandomPassword } = req.body;
    try {
        const user = yield authModel_1.Auth.findOne({
            where: { username: username },
            include: [verificationModel_1.Verification],
        });
        if (!user) {
            return res.status(400).json({
                msg: messages_1.errorMessages.userNotExists(username),
            });
        }
        if (!user.verification.isEmailVerified) {
            return res.status(400).json({
                msg: messages_1.errorMessages.userNotVerified,
            });
        }
        if (!user.verification.isPhoneVerified) {
            return res.status(400).json({
                msg: messages_1.errorMessages.phoneVerificationRequired,
            });
        }
        if (user.loginAttempts >= MAX_LOGIN_ATTEMPTS) {
            const currentDate = new Date();
            if (user.verification.blockExpiration && user.verification.blockExpiration > currentDate) {
                const timeLeft = Math.ceil((user.verification.blockExpiration.getTime() - currentDate.getTime()) / (60 * 1000));
                return res.status(400).json({
                    msg: `La cuenta está bloqueada temporalmente debido a múltiples intentos fallidos. Inténtalo de nuevo más tarde. Tiempo restante: ${timeLeft} minutos`,
                });
            }
            else {
                yield (0, authUtils_1.lockAccount)(username);
            }
        }
        let passwordValid = false;
        if (passwordorrandomPassword.length === 8) {
            passwordValid = passwordorrandomPassword === user.verification.randomPassword;
        }
        else {
            passwordValid = yield bcryptjs_1.default.compare(passwordorrandomPassword, user.password);
        }
        if (!passwordValid) {
            const updatedLoginAttempts = (user.verification.loginAttempts || 0) + 1;
            yield verificationModel_1.Verification.update({ loginAttempts: updatedLoginAttempts }, { where: { userId: user.id } });
            if (updatedLoginAttempts >= MAX_LOGIN_ATTEMPTS) {
                yield (0, authUtils_1.lockAccount)(username);
                return res.status(400).json({
                    msg: messages_1.errorMessages.accountLocked,
                });
            }
            return res.status(400).json({
                msg: messages_1.errorMessages.incorrectPassword(updatedLoginAttempts),
            });
        }
        yield verificationModel_1.Verification.update({ loginAttempts: 0 }, { where: { userId: user.id } });
        if (user.verification.blockExpiration) {
            const currentDate = new Date();
            if (user.verification.blockExpiration > currentDate) {
                const timeLeft = Math.ceil((user.verification.blockExpiration.getTime() - currentDate.getTime()) / (60 * 1000));
                return res.status(400).json({
                    msg: `La cuenta está bloqueada temporalmente debido a múltiples intentos fallidos. Inténtalo de nuevo más tarde. Tiempo restante: ${timeLeft} minutos`,
                });
            }
        }
        const token = jsonwebtoken_1.default.sign({
            username: username,
            rol: user.rol,
            userId: user.id
        }, process.env.SECRET_KEY || 'pepito123');
        if (passwordorrandomPassword.length === 8) {
            const resetPasswordToken = jsonwebtoken_1.default.sign({
                username: username,
                rol: user.rol,
                userId: user.id
            }, process.env.SECRET_KEY || 'pepito123', { expiresIn: '1h' });
            return res.json({
                msg: 'Inicio de sesión Recuperación de contraseña',
                token: resetPasswordToken,
                passwordorrandomPassword: 'randomPassword'
            });
        }
        else {
            return res.json({
                msg: messages_1.successMessages.userLoggedIn,
                token: token,
                userId: user.id,
                rol: user.rol,
            });
        }
    }
    catch (error) {
        res.status(500).json({
            msg: messages_1.errorMessages.databaseError,
            error,
        });
    }
});
exports.loginUser = loginUser;
