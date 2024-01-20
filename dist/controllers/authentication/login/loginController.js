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
        include: ['verification'],
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
    const updatedLoginAttempts = yield incrementLoginAttempts(user);
    if (updatedLoginAttempts >= MAX_LOGIN_ATTEMPTS) {
        return handleLockedAccount(user.username, res);
    }
    const errorMessage = messages_1.errorMessages.incorrectPassword(updatedLoginAttempts);
    return sendBadRequest(res, errorMessage);
});
const incrementLoginAttempts = (user) => __awaiter(void 0, void 0, void 0, function* () {
    const updatedLoginAttempts = (user.verification.loginAttempts || 0) + 1;
    yield user.verification.update({ loginAttempts: updatedLoginAttempts });
    return updatedLoginAttempts;
});
const handleSuccessfulLogin = (user, res, password) => {
    const msg = password.length === 8 ? 'Inicio de sesión Recuperación de contraseña' : messages_1.successMessages.userLoggedIn;
    const token = generateAuthToken(user);
    const userId = user.id;
    const rol = user.rol;
    const passwordorrandomPassword = password.length === 8 ? 'randomPassword' : undefined;
    return res.json({ msg, token, userId, rol, passwordorrandomPassword });
};
const generateAuthToken = (user) => {
    return jsonwebtoken_1.default.sign({
        username: user.username,
        rol: user.rol,
        userId: user.id
    }, process.env.SECRET_KEY || 'pepito123');
};
const sendBadRequest = (res, msg) => res.status(400).json({ msg });
const sendDatabaseError = (res, error) => res.status(500).json({ msg: messages_1.errorMessages.databaseError, error });
const loginUser = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { username, passwordorrandomPassword } = req.body;
    try {
        const user = yield getUserByUsername(username);
        if (!user) {
            return sendBadRequest(res, messages_1.errorMessages.userNotExists(username));
        }
        if (!isUserVerified(user, res) || handleBlockExpiration(user, res)) {
            return;
        }
        if (!(yield validatePassword(user, passwordorrandomPassword))) {
            return handleIncorrectPassword(user, res);
        }
        yield resetLoginAttempts(user);
        return handleSuccessfulLogin(user, res, passwordorrandomPassword);
    }
    catch (error) {
        return sendDatabaseError(res, error);
    }
});
exports.loginUser = loginUser;
const isUserVerified = (user, res) => {
    const isEmailValid = isEmailVerified(user, res);
    const isPhoneValid = isPhoneVerified(user, res);
    return isEmailValid && isPhoneValid;
};
const isEmailVerified = (user, res) => {
    if (!user.verification.isEmailVerified) {
        handleUnverifiedUser(res);
        return false;
    }
    return true;
};
const isPhoneVerified = (user, res) => {
    if (!user.verification.isPhoneVerified) {
        res.status(400).json({ msg: messages_1.errorMessages.numberNotVerified });
        return false;
    }
    return true;
};
const handleBlockExpiration = (user, res) => {
    if (isAccountBlocked(user)) {
        const timeLeft = calculateTimeLeft(user.verification.blockExpiration, new Date());
        sendAccountBlockedResponse(res, timeLeft);
        return true;
    }
    return false;
};
const isAccountBlocked = (user) => {
    const blockExpiration = user.verification.blockExpiration;
    const currentDate = new Date();
    return blockExpiration && blockExpiration > currentDate;
};
const sendAccountBlockedResponse = (res, timeLeft) => {
    res.status(400).json({ msg: messages_1.errorMessages.accountLockedv1(timeLeft) });
};
const calculateTimeLeft = (blockExpiration, currentDate) => {
    const minutesLeft = Math.ceil((blockExpiration.getTime() - currentDate.getTime()) / (60 * 1000));
    return minutesLeft.toString();
};
const resetLoginAttempts = (user) => __awaiter(void 0, void 0, void 0, function* () {
    yield user.verification.update({ loginAttempts: 0 });
});
const validatePassword = (user, password) => __awaiter(void 0, void 0, void 0, function* () {
    if (password.length === 8) {
        return password === user.verification.randomPassword;
    }
    else {
        return yield bcryptjs_1.default.compare(password, user.password);
    }
});
