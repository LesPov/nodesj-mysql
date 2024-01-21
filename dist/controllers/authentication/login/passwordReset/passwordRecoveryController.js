"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requestPasswordReset = void 0;
const authModel_1 = require("../../../../models/authModel");
const verificationModel_1 = require("../../../../models/verificationModel");
const messages_1 = require("../../../../middleware/messages");
const emailUtils_1 = require("../../../../utils/emailUtils");
const passwordUtils_1 = require("../../../../utils/passwordUtils");
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
/////////////////////////////////////////////////////////////envioPasswordReset//////////////////////////////////////////////////////////////////////////
/**
 * Busca al usuario en la base de datos según el nombre de usuario o correo electrónico.
 * @param {string} usernameOrEmail - Nombre de usuario o correo electrónico.
 * @returns {Promise<AuthModel | null>} - Usuario encontrado o nulo si no se encuentra.
 */
const findUser = async (usernameOrEmail) => {
    if (EMAIL_REGEX.test(usernameOrEmail)) {
        return await authModel_1.Auth.findOne({ where: { email: usernameOrEmail }, include: [verificationModel_1.Verification] });
    }
    else {
        return await authModel_1.Auth.findOne({ where: { username: usernameOrEmail }, include: [verificationModel_1.Verification] });
    }
};
/**
 * Verifica si la cuenta del usuario está verificada.
 * @param {AuthModel | null} user - Usuario.
 * @returns {boolean} - Indica si la cuenta está verificada.
 */
const isAccountVerified = (user) => {
    const verification = user === null || user === void 0 ? void 0 : user.verification;
    return !!verification && verification.isEmailVerified && verification.isPhoneVerified;
};
/**
 * Genera una nueva contraseña aleatoria su expiracion es de 5 min y actualiza el registro de verificación.
 * @param {VerificationModel} verification - Registro de verificación.
 * @returns {string} - Nueva contraseña aleatoria generada.
 */
const generateAndSetRandomPassword = async (verification) => {
    const randomPassword = (0, passwordUtils_1.generateRandomPassword)(8);
    const expirationTime = new Date();
    expirationTime.setMinutes(expirationTime.getMinutes() + 5);
    verification.randomPassword = randomPassword;
    verification.verificationCodeExpiration = expirationTime;
    await verification.save();
    setTimeout(async () => {
        verification.randomPassword = '';
        await verification.save();
    }, 5 * 60 * 1000);
    return randomPassword;
};
/**
 * Valida la entrada del usuario.
 * @param {string} usernameOrEmail - Nombre de usuario o correo electrónico.
 * @param {Response} res - Objeto de respuesta de Express.
 * @returns {boolean} - Indica si la validación fue exitosa.
 */
const validateInput = (usernameOrEmail, res) => {
    if (!usernameOrEmail) {
        res.status(400).json({
            msg: messages_1.errorMessages.missingUsernameOrEmail,
        });
        return false;
    }
    return true;
};
/**
 * Maneja la lógica de solicitud de recuperación de contraseña.
 * @param {AuthModel} user - Usuario.
 * @param {Response} res - Objeto de respuesta de Express.
 * @returns {Promise<void>} - Responde con un mensaje y puede enviar un correo electrónico de recuperación de contraseña.
 */
const handlePasswordResetLogic = async (user, res) => {
    if (!isAccountVerified(user)) {
        res.status(400).json({
            msg: messages_1.errorMessages.unverifiedAccount,
        });
    }
    else {
        const randomPassword = await generateAndSetRandomPassword(user.verification);
        const emailSent = await (0, emailUtils_1.sendPasswordResetEmail)(user.email, user.username, randomPassword);
        res.json({
            msg: messages_1.successMessages.passwordResetEmailSent,
        });
    }
};
/**
 * Maneja la lógica de solicitud de recuperación de contraseña.
 * @param {Request} req - Objeto de solicitud de Express.
 * @param {Response} res - Objeto de respuesta de Express.
 * @returns {Promise<void>} - Responde con un mensaje y puede enviar un correo electrónico de recuperación de contraseña.
 */
const requestPasswordReset = async (req, res) => {
    const { usernameOrEmail } = req.body;
    if (!validateInput(usernameOrEmail, res)) {
        return;
    }
    try {
        const user = await findUser(usernameOrEmail);
        await handlePasswordReset(user, res);
    }
    catch (error) {
        handlePasswordResetError(error, res);
    }
};
exports.requestPasswordReset = requestPasswordReset;
/**
 * Maneja la lógica de solicitud de recuperación de contraseña.
 * @param {AuthModel | null} user - Usuario para recuperación de contraseña.
 * @param {Response} res - Objeto de respuesta de Express.
 * @returns {Promise<void>} - Responde con un mensaje y puede enviar un correo electrónico de recuperación de contraseña.
 */
const handlePasswordReset = async (user, res) => {
    // Verifica si el usuario existe
    if (!user) {
        userNotFoundResponse(res);
        return;
    }
    // Verifica si la cuenta del usuario está verificada
    if (!isAccountVerified(user)) {
        unverifiedAccountResponse(res);
        return;
    }
    // Genera una nueva contraseña aleatoria y actualiza el registro de verificación
    const randomPassword = await generateAndSetRandomPassword(user.verification);
    // Envía un correo electrónico con la nueva contraseña aleatoria
    const emailSent = await (0, emailUtils_1.sendPasswordResetEmail)(user.email, user.username, randomPassword);
    // Responde con un mensaje de éxito
    successResponse(res, messages_1.successMessages.passwordResetEmailSent);
};
/**
 * Responde con un mensaje de error cuando no se encuentra el usuario.
 * @param {Response} res - Objeto de respuesta de Express.
 */
const userNotFoundResponse = (res) => {
    res.status(404).json({
        msg: messages_1.errorMessages.userNotFound,
    });
};
/**
 * Responde con un mensaje de error cuando la cuenta del usuario no está verificada.
 * @param {Response} res - Objeto de respuesta de Express.
 */
const unverifiedAccountResponse = (res) => {
    res.status(400).json({
        msg: messages_1.errorMessages.unverifiedAccount,
    });
};
/**
 * Responde con un mensaje de éxito.
 * @param {Response} res - Objeto de respuesta de Express.
 * @param {string} message - Mensaje de éxito.
 */
const successResponse = (res, message) => {
    res.json({
        msg: message,
    });
};
/**
 * Maneja errores durante el proceso de recuperación de contraseña.
 * @param {any} error - Objeto de error.
 * @param {Response} res - Objeto de respuesta de Express.
 */
const handlePasswordResetError = (error, res) => {
    console.error('Error al solicitar recuperación de contraseña:', error);
    res.status(500).json({
        msg: messages_1.errorMessages.serverError,
    });
};
