"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.loginUser = void 0;
const messages_1 = require("../../../middleware/messages");
const authUtils_1 = require("../../../utils/authUtils");
const authService_1 = require("../../../services/auth/authService");
const userService_1 = require("../../../services/user/userService");
// Máximo de intentos de inicio de sesión permitidos
const MAX_LOGIN_ATTEMPTS = 5;
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
const handleLockedAccount = async (username, res) => {
    await (0, authUtils_1.lockAccount)(username);
    return res.status(400).json({ msg: messages_1.errorMessages.accountLocked });
};
/**
 * Maneja la respuesta cuando se ingresa una contraseña incorrecta.
 * @param user - El usuario que intentó iniciar sesión.
 * @param res - La respuesta HTTP para la solicitud.
 * @returns Un mensaje de error en formato JSON con información sobre los intentos de inicio de sesión.
 */
const handleIncorrectPassword = async (user, res) => {
    const updatedLoginAttempts = await incrementLoginAttempts(user);
    if (updatedLoginAttempts >= MAX_LOGIN_ATTEMPTS) {
        return handleLockedAccount(user.username, res);
    }
    const errorMessage = messages_1.errorMessages.incorrectPassword(updatedLoginAttempts);
    return sendBadRequest(res, errorMessage);
};
/**
 * Incrementa el contador de intentos de inicio de sesión de un usuario.
 * @param user - El usuario cuyo contador de intentos de inicio de sesión se incrementará.
 * @returns La cantidad actualizada de intentos de inicio de sesión.
 */
const incrementLoginAttempts = async (user) => {
    const updatedLoginAttempts = (user.verification.loginAttempts || 0) + 1;
    await user.verification.update({ loginAttempts: updatedLoginAttempts });
    return updatedLoginAttempts;
};
/**
 * Maneja la respuesta cuando un usuario inicia sesión con éxito.
 * @param user - El usuario que inició sesión.
 * @param res - La respuesta HTTP para la solicitud.
 * @param password - La contraseña utilizada para iniciar sesión.
 * @returns Un mensaje de éxito en formato JSON con el token de autenticación, el ID del usuario, el rol y, opcionalmente, la información de la contraseña.
 */
const handleSuccessfulLogin = (user, res, password) => {
    const msg = password.length === 8 ? 'Inicio de sesión Recuperación de contraseña' : messages_1.successMessages.userLoggedIn;
    const token = (0, authService_1.generateAuthToken)(user);
    const userId = user.id;
    const rol = user.rol;
    const passwordorrandomPassword = password.length === 8 ? 'randomPassword' : undefined;
    return res.json({ msg, token, userId, rol, passwordorrandomPassword });
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
const loginUser = async (req, res) => {
    const { username, passwordorrandomPassword } = req.body;
    try {
        const user = await verifyUser(username, passwordorrandomPassword, res);
        if (user && !(await (0, authService_1.validatePassword)(user, passwordorrandomPassword))) {
            return handleIncorrectPassword(user, res);
        }
        if (user) {
            await (0, userService_1.resetLoginAttempts)(user);
            return handleSuccessfulLogin(user, res, passwordorrandomPassword);
        }
    }
    catch (error) {
        return handleErrorResponse(res, error);
    }
};
exports.loginUser = loginUser;
/**
 * Maneja la respuesta para errores de la base de datos.
 * @param res - La respuesta HTTP para la solicitud.
 * @param error - El error de la base de datos.
 * @returns Un mensaje de error en formato JSON con información sobre el error de la base de datos.
 */
const handleErrorResponse = (res, error) => {
    return res.status(500).json({ msg: messages_1.errorMessages.databaseError, error });
};
/**
 * Verifica la existencia y estado de un usuario antes de iniciar sesión.
 * @param username - El nombre de usuario del usuario.
 * @param password - La contraseña proporcionada durante el inicio de sesión.
 * @param res - La respuesta HTTP para la solicitud.
 * @returns El objeto de usuario si la verificación es exitosa, de lo contrario, retorna null.
 */
const verifyUser = async (username, password, res) => {
    // Obtiene el usuario de la base de datos utilizando el nombre de usuario.
    const user = await (0, userService_1.getUserByUsername)(username);
    // Verifica si el usuario no existe y envía una respuesta de error si es así.
    if (!user) {
        sendBadRequest(res, messages_1.errorMessages.userNotExists(username));
        return null;
    }
    // Verifica si el usuario está verificado y no está bloqueado antes de continuar.
    if (!isUserVerified(user, res) || handleBlockExpiration(user, res)) {
        return null;
    }
    // Retorna el objeto de usuario si todas las verificaciones son exitosas.
    return user;
};
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
