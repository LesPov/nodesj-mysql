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
 * Validar la longitud mínima de la contraseña.
 * @param newPassword - Nueva contraseña a validar.
 * @returns Mensajes de error si la longitud no cumple con las reglas, nulo si es válida.
 */
const validateLength = (newPassword) => {
    return newPassword.length < PASSWORD_MIN_LENGTH ? messages_1.errorMessages.passwordTooShort : null;
};
/**
 * Validar la presencia de al menos una letra mayúscula en la contraseña.
 * @param newPassword - Nueva contraseña a validar.
 * @returns Mensajes de error si no cumple con las reglas, nulo si es válida.
 */
const validateUppercase = (newPassword) => {
    return PASSWORD_REGEX_UPPERCASE.test(newPassword) ? null : messages_1.errorMessages.passwordNoUppercase;
};
/**
 * Validar la presencia de al menos una letra minúscula en la contraseña.
 * @param newPassword - Nueva contraseña a validar.
 * @returns Mensajes de error si no cumple con las reglas, nulo si es válida.
 */
const validateLowercase = (newPassword) => {
    return PASSWORD_REGEX_LOWERCASE.test(newPassword) ? null : messages_1.errorMessages.passwordNoLowercase;
};
/**
 * Validar la presencia de al menos un número en la contraseña.
 * @param newPassword - Nueva contraseña a validar.
 * @returns Mensajes de error si no cumple con las reglas, nulo si es válida.
 */
const validateNumber = (newPassword) => {
    return PASSWORD_REGEX_NUMBER.test(newPassword) ? null : messages_1.errorMessages.passwordNoNumber;
};
/**
 * Validar la presencia de al menos un carácter especial en la contraseña.
 * @param newPassword - Nueva contraseña a validar.
 * @returns Mensajes de error si no cumple con las reglas, nulo si es válida.
 */
const validateSpecialChar = (newPassword) => {
    return PASSWORD_REGEX_SPECIAL.test(newPassword) ? null : messages_1.errorMessages.passwordNoSpecialChar;
};
/**
 * Validar la nueva contraseña según las reglas establecidas.
 * @param newPassword - Nueva contraseña a validar.
 * @returns Mensajes de error si la contraseña no cumple con las reglas, nulo si es válida.
 */
const validateNewPassword = (newPassword) => {
    const errors = [
        validateLength(newPassword),
        validateUppercase(newPassword),
        validateLowercase(newPassword),
        validateNumber(newPassword),
        validateSpecialChar(newPassword),
    ].filter((error) => error !== null);
    return errors;
};
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
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
            handleResponse(res, 404, { msg: messages_1.errorMessages.userNotFound });
            return;
        }
        validateAndResetPassword(user, res, randomPassword, newPassword);
    }
    catch (error) {
        handleServerError(error, res);
    }
};
exports.resetPassword = resetPassword;
/**
 * Valida y actualiza la contraseña del usuario.
 * @param user - Objeto de modelo de usuario.
 * @param res - Objeto de respuesta.
 * @param randomPassword - Contraseña aleatoria proporcionada.
 * @param newPassword - Nueva contraseña a establecer.
 */
const validateAndResetPassword = async (user, res, randomPassword, newPassword) => {
    try {
        validateAccountAndVerification(user, res, randomPassword, newPassword);
        await updateAndClearPassword(user, user.verification, newPassword);
        if (!res.headersSent) {
            res.status(200).json({ msg: messages_1.successMessages.passwordUpdated });
        }
    }
    catch (error) {
        handleServerError(error, res);
    }
};
const validateAccountAndVerification = (user, res, randomPassword, newPassword) => {
    validateAccountVerification(user, res);
    const verification = getVerification(user);
    validateRandomPasswordAndNewPassword(verification, res, randomPassword, newPassword);
};
const validateRandomPassword = (verification, res, randomPassword) => {
    if (!verification || !isRandomPasswordValid(verification, randomPassword)) {
        handleResponse(res, 400, { msg: messages_1.errorMessages.invalidRandomPassword });
        return false;
    }
    return true;
};
const validatePasswordErrors = (res, newPassword) => {
    const passwordValidationErrors = validateNewPassword(newPassword);
    if (passwordValidationErrors.length > 0) {
        handleResponse(res, 400, { msg: messages_1.errorMessages.passwordValidationFailed, errors: passwordValidationErrors });
        return passwordValidationErrors;
    }
    return [];
};
const validateRandomPasswordAndNewPassword = (verification, res, randomPassword, newPassword) => {
    if (!validateRandomPassword(verification, res, randomPassword)) {
        return;
    }
    const passwordErrors = validatePasswordErrors(res, newPassword);
    if (passwordErrors.length > 0) {
        return;
    }
};
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
