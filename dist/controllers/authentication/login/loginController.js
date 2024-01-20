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
// Máximo de intentos de inicio de sesión permitidos
const MAX_LOGIN_ATTEMPTS = 5;
/**
 * Recupera un usuario de la base de datos por nombre de usuario.
 * @param username - El nombre de usuario a buscar.
 * @returns Una instancia de usuario de la base de datos con detalles de verificación incluidos.
 */
const getUserByUsername = (username) => __awaiter(void 0, void 0, void 0, function* () {
    return yield authModel_1.Auth.findOne({
        where: { username: username },
        include: ['verification'],
    });
});
/**
 * Maneja la respuesta cuando un usuario no está verificado.
 * @param res - La respuesta HTTP para la solicitud.
 * @returns Un mensaje de error en formato JSON.
 */
const handleUnverifiedUser = (res) => {
    return res.status(400).json({ msg: messages_1.errorMessages.userNotVerified });
};
/**
 * Bloquea una cuenta y maneja la respuesta cuando se intenta acceder a una cuenta bloqueada.
 * @param username - El nombre de usuario cuya cuenta se va a bloquear.
 * @param res - La respuesta HTTP para la solicitud.
 * @returns Un mensaje de error en formato JSON.
 */
const handleLockedAccount = (username, res) => __awaiter(void 0, void 0, void 0, function* () {
    yield (0, authUtils_1.lockAccount)(username);
    return res.status(400).json({ msg: messages_1.errorMessages.accountLocked });
});
/**
 * Maneja la respuesta cuando se ingresa una contraseña incorrecta.
 * @param user - El usuario que intentó iniciar sesión.
 * @param res - La respuesta HTTP para la solicitud.
 * @returns Un mensaje de error en formato JSON con información sobre los intentos de inicio de sesión.
 */
const handleIncorrectPassword = (user, res) => __awaiter(void 0, void 0, void 0, function* () {
    const updatedLoginAttempts = yield incrementLoginAttempts(user);
    if (updatedLoginAttempts >= MAX_LOGIN_ATTEMPTS) {
        return handleLockedAccount(user.username, res);
    }
    const errorMessage = messages_1.errorMessages.incorrectPassword(updatedLoginAttempts);
    return sendBadRequest(res, errorMessage);
});
/**
 * Incrementa el contador de intentos de inicio de sesión de un usuario.
 * @param user - El usuario cuyo contador de intentos de inicio de sesión se incrementará.
 * @returns La cantidad actualizada de intentos de inicio de sesión.
 */
const incrementLoginAttempts = (user) => __awaiter(void 0, void 0, void 0, function* () {
    const updatedLoginAttempts = (user.verification.loginAttempts || 0) + 1;
    yield user.verification.update({ loginAttempts: updatedLoginAttempts });
    return updatedLoginAttempts;
});
/**
 * Maneja la respuesta cuando un usuario inicia sesión con éxito.
 * @param user - El usuario que inició sesión.
 * @param res - La respuesta HTTP para la solicitud.
 * @param password - La contraseña utilizada para iniciar sesión.
 * @returns Un mensaje de éxito en formato JSON con el token de autenticación, el ID del usuario, el rol y, opcionalmente, la información de la contraseña.
 */
const handleSuccessfulLogin = (user, res, password) => {
    const msg = password.length === 8 ? 'Inicio de sesión Recuperación de contraseña' : messages_1.successMessages.userLoggedIn;
    const token = generateAuthToken(user);
    const userId = user.id;
    const rol = user.rol;
    const passwordorrandomPassword = password.length === 8 ? 'randomPassword' : undefined;
    return res.json({ msg, token, userId, rol, passwordorrandomPassword });
};
/**
 * Genera un token de autenticación JWT para un usuario.
 * @param user - El usuario para el cual se generará el token.
 * @returns El token de autenticación JWT.
 */
const generateAuthToken = (user) => {
    return jsonwebtoken_1.default.sign({
        username: user.username,
        rol: user.rol,
        userId: user.id
    }, process.env.SECRET_KEY || 'pepito123');
};
/**
 * Maneja la respuesta para solicitudes inválidas.
 * @param res - La respuesta HTTP para la solicitud.
 * @param msg - El mensaje de error.
 * @returns Un mensaje de error en formato JSON.
 */
const sendBadRequest = (res, msg) => res.status(400).json({ msg });
/**
 * Maneja la respuesta para errores de la base de datos.
 * @param res - La respuesta HTTP para la solicitud.
 * @param error - El error de la base de datos.
 * @returns Un mensaje de error en formato JSON con información sobre el error de la base de datos.
 */
const sendDatabaseError = (res, error) => res.status(500).json({ msg: messages_1.errorMessages.databaseError, error });
/**
 * Maneja la solicitud de inicio de sesión de un usuario.
 * @param req - La solicitud HTTP.
 * @param res - La respuesta HTTP.
 * @returns Respuestas de éxito o error en formato JSON, según el resultado del inicio de sesión.
 */
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
/**
 * Verifica si un usuario está verificado, es decir, si su correo electrónico y número de teléfono han sido verificados.
 * @param user - El usuario a verificar.
 * @param res - La respuesta HTTP para la solicitud.
 * @returns `true` si el usuario está verificado, `false` si no lo está.
 */
const isUserVerified = (user, res) => {
    const isEmailValid = isEmailVerified(user, res);
    const isPhoneValid = isPhoneVerified(user, res);
    return isEmailValid && isPhoneValid;
};
/**
 * Verifica si el correo electrónico de un usuario está verificado.
 * @param user - El usuario a verificar.
 * @param res - La respuesta HTTP para la solicitud.
 * @returns `true` si el correo electrónico está verificado, `false` si no lo está.
 */
const isEmailVerified = (user, res) => {
    if (!user.verification.isEmailVerified) {
        handleUnverifiedUser(res);
        return false;
    }
    return true;
};
/**
 * Verifica si el número de teléfono de un usuario está verificado.
 * @param user - El usuario a verificar.
 * @param res - La respuesta HTTP para la solicitud.
 * @returns `true` si el número de teléfono está verificado, `false` si no lo está.
 */
const isPhoneVerified = (user, res) => {
    if (!user.verification.isPhoneVerified) {
        res.status(400).json({ msg: messages_1.errorMessages.numberNotVerified });
        return false;
    }
    return true;
};
/**
 * Maneja la respuesta cuando la cuenta de un usuario está bloqueada debido a un bloqueo activo.
 * @param user - El usuario para el cual se verificará el bloqueo.
 * @param res - La respuesta HTTP para la solicitud.
 * @returns `true` si la cuenta está bloqueada, `false` si no lo está.
 */
const handleBlockExpiration = (user, res) => {
    if (isAccountBlocked(user)) {
        const timeLeft = calculateTimeLeft(user.verification.blockExpiration, new Date());
        sendAccountBlockedResponse(res, timeLeft);
        return true;
    }
    return false;
};
/**
 * Verifica si la cuenta de un usuario está bloqueada.
 * @param user - El usuario a verificar.
 * @returns `true` si la cuenta está bloqueada, `false` si no lo está.
 */
const isAccountBlocked = (user) => {
    const blockExpiration = user.verification.blockExpiration;
    const currentDate = new Date();
    return blockExpiration && blockExpiration > currentDate;
};
/**
 * Maneja la respuesta cuando la cuenta de un usuario está bloqueada, proporcionando el tiempo restante antes del desbloqueo.
 * @param res - La respuesta HTTP para la solicitud.
 * @param timeLeft - El tiempo restante antes del desbloqueo en minutos.
 */
const sendAccountBlockedResponse = (res, timeLeft) => {
    res.status(400).json({ msg: messages_1.errorMessages.accountLockedv1(timeLeft) });
};
/**
 * Calcula el tiempo restante antes de que se desbloquee la cuenta de un usuario.
 * @param blockExpiration - La fecha y hora en que expira el bloqueo.
 * @param currentDate - La fecha y hora actuales.
 * @returns El tiempo restante en minutos antes de que se desbloquee la cuenta, representado como una cadena.
 */
const calculateTimeLeft = (blockExpiration, currentDate) => {
    const minutesLeft = Math.ceil((blockExpiration.getTime() - currentDate.getTime()) / (60 * 1000));
    return minutesLeft.toString();
};
/**
 * Restablece el contador de intentos de inicio de sesión de un usuario.
 * @param user - El usuario cuyo contador de intentos de inicio de sesión se restablecerá.
 */
const resetLoginAttempts = (user) => __awaiter(void 0, void 0, void 0, function* () {
    yield user.verification.update({ loginAttempts: 0 });
});
/**
 * Valida la contraseña proporcionada por el usuario.
 * @param user - El usuario para el cual se realizará la validación.
 * @param password - La contraseña proporcionada por el usuario.
 * @returns `true` si la contraseña es válida, `false` si no lo es o si se proporciona una contraseña aleatoria.
 */
const validatePassword = (user, password) => __awaiter(void 0, void 0, void 0, function* () {
    if (password.length === 8) {
        return password === user.verification.randomPassword;
    }
    else {
        return yield bcryptjs_1.default.compare(password, user.password);
    }
});
