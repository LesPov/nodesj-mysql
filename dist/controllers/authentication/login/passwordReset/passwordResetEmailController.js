"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.resetPassword = void 0;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const authModel_1 = require("../../../../models/authModel");
const verificationModel_1 = require("../../../../models/verificationModel");
const messages_1 = require("../../../../middleware/messages");
const PASSWORD_MIN_LENGTH = 10;
const PASSWORD_REGEX_NUMBER = /\d/;
const PASSWORD_REGEX_UPPERCASE = /[A-Z]/;
const PASSWORD_REGEX_LOWERCASE = /[a-z]/;
const PASSWORD_REGEX_SPECIAL = /[&$@_/-]/;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
/**
 * Verificar si la cuenta del usuario está verificada.
 * @param {AuthModel} user - Usuario para verificar.
 * @returns {boolean} - True si la cuenta está verificada, false de lo contrario.
 */
const isAccountVerified = (user) => {
    const verification = user.verification;
    // Retornar false si no hay registro de verificación o la cuenta no está verificada
    return verification ? (verification.isEmailVerified && verification.isPhoneVerified) : false;
};
/**
 * Validar la contraseña aleatoria y el tiempo de expiración.
 * @param {VerificationModel} verification - Registro de verificación.
 * @param {string} randomPassword - Contraseña aleatoria proporcionada.
 * @returns {boolean} - True si la contraseña aleatoria y el tiempo son válidos, false de lo contrario.
 */
const isRandomPasswordValid = (verification, randomPassword) => {
    return verification.randomPassword === randomPassword && verification.verificationCodeExpiration >= new Date();
};
/**
 * Validar la nueva contraseña según las reglas establecidas.
 * @param newPassword - Nueva contraseña a validar.
 * @returns Mensajes de error si la contraseña no cumple con las reglas, nulo si es válida.
 */
const validateNewPassword = (newPassword) => {
    const errors = [];
    if (newPassword.length < PASSWORD_MIN_LENGTH) {
        errors.push('La contraseña debe tener al menos 10 caracteres');
    }
    if (!PASSWORD_REGEX_UPPERCASE.test(newPassword)) {
        errors.push('La contraseña debe contener al menos una letra mayúscula.');
    }
    if (!PASSWORD_REGEX_LOWERCASE.test(newPassword)) {
        errors.push('La contraseña debe contener al menos una letra minúscula.');
    }
    if (!PASSWORD_REGEX_NUMBER.test(newPassword)) {
        errors.push('La contraseña debe contener al menos un número.');
    }
    if (!PASSWORD_REGEX_SPECIAL.test(newPassword)) {
        errors.push('La contraseña debe contener al menos un carácter especial.');
    }
    return errors;
};
/**
 * Controlador para resetear la contraseña mediante el envío de un correo electrónico.
 * @param req - Objeto de solicitud.
 * @param res - Objeto de respuesta.
 */
const resetPassword = async (req, res) => {
    const { usernameOrEmail, randomPassword, newPassword } = req.body;
    try {
        const user = await findUser(usernameOrEmail);
        if (!user) {
            // Cambia este bloque para que responda con "userNotFound" en lugar de "invalidRandomPassword"
            handleResponse(res, 404, { msg: messages_1.errorMessages.userNotFound });
            return;
        }
        validateAccountAndVerification(user, res, randomPassword, newPassword);
        await updateAndClearPassword(user, user.verification, newPassword);
        // Evitar enviar múltiples respuestas HTTP después de la actualización de la contraseña.
        if (!res.headersSent) {
            res.json({ msg: messages_1.successMessages.passwordUpdated });
        }
    }
    catch (error) {
        handleServerError(error, res);
    }
};
exports.resetPassword = resetPassword;
const validateAccountAndVerification = (user, res, randomPassword, newPassword) => {
    validateAccountVerification(user, res);
    const verification = getVerification(user);
    validateRandomPasswordAndNewPassword(verification, res, randomPassword, newPassword);
};
const validateRandomPasswordAndNewPassword = (verification, res, randomPassword, newPassword) => {
    if (!verification || !isRandomPasswordValid(verification, randomPassword)) {
        handleResponse(res, 400, { msg: messages_1.errorMessages.invalidRandomPassword });
        return;
    }
    const passwordValidationErrors = validateNewPassword(newPassword);
    if (passwordValidationErrors.length > 0) {
        handleResponse(res, 400, { msg: messages_1.errorMessages.passwordValidationFailed, errors: passwordValidationErrors });
        return;
    }
};
// Resto del código (funciones handleResponse, findUser, validateAccountVerification, getVerification, updateAndClearPassword, handleServerError, etc.)
const handleResponse = (res, statusCode, response) => {
    res.status(statusCode).json(response);
};
const findUser = async (usernameOrEmail) => {
    if (EMAIL_REGEX.test(usernameOrEmail)) {
        return await authModel_1.Auth.findOne({ where: { email: usernameOrEmail }, include: [verificationModel_1.Verification] });
    }
    else {
        return await authModel_1.Auth.findOne({ where: { username: usernameOrEmail }, include: [verificationModel_1.Verification] });
    }
};
const validateAccountVerification = (user, res) => {
    if (!isAccountVerified(user)) {
        res.status(400).json({ msg: messages_1.errorMessages.unverifiedAccount });
    }
};
const getVerification = (user) => {
    return user.verification;
};
const updateAndClearPassword = async (user, verification, newPassword) => {
    const hashedPassword = await bcryptjs_1.default.hash(newPassword, 10);
    user.password = hashedPassword;
    if (verification) {
        verification.randomPassword = '';
        verification.verificationCodeExpiration = new Date();
        await verification.save();
    }
    await user.save();
};
const handleServerError = (error, res) => {
    console.error('Error al resetear la contraseña:', error);
    if (!res.headersSent) {
        res.status(500).json({ msg: messages_1.errorMessages.serverError, error: error });
    }
};
