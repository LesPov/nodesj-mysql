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
 * Buscar al usuario en la base de datos según el nombre de usuario o correo electrónico.
 * @param {string} usernameOrEmail - Nombre de usuario o correo electrónico.
 * @returns {Promise<AuthModel | null>} - Usuario encontrado o nulo si no existe.
 */
const findUserByUsernameOrEmail = async (usernameOrEmail) => {
    if (EMAIL_REGEX.test(usernameOrEmail)) {
        return await authModel_1.Auth.findOne({ where: { email: usernameOrEmail }, include: [verificationModel_1.Verification] });
    }
    else {
        return await authModel_1.Auth.findOne({ where: { username: usernameOrEmail }, include: [verificationModel_1.Verification] });
    }
};
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
 * @param {string} newPassword - Nueva contraseña a validar.
 * @returns {string | null} - Mensaje de error si la longitud es insuficiente, nulo si es válida.
 */
const validateMinLength = (newPassword) => {
    return newPassword.length < PASSWORD_MIN_LENGTH ? messages_1.errorMessages.passwordTooShort : null;
};
/**
 * Validar la presencia de al menos un número en la contraseña.
 * @param {string} newPassword - Nueva contraseña a validar.
 * @returns {string | null} - Mensaje de error si no hay un número, nulo si es válida.
 */
const validateNumber = (newPassword) => {
    return PASSWORD_REGEX_NUMBER.test(newPassword) ? null : messages_1.errorMessages.passwordNoNumber;
};
/**
 * Validar la presencia de al menos una mayúscula en la contraseña.
 * @param {string} newPassword - Nueva contraseña a validar.
 * @returns {string | null} - Mensaje de error si no hay una mayúscula, nulo si es válida.
 */
const validateUppercase = (newPassword) => {
    return PASSWORD_REGEX_UPPERCASE.test(newPassword) ? null : messages_1.errorMessages.passwordNoUppercase;
};
/**
 * Validar la presencia de al menos una minúscula en la contraseña.
 * @param {string} newPassword - Nueva contraseña a validar.
 * @returns {string | null} - Mensaje de error si no hay una minúscula, nulo si es válida.
 */
const validateLowercase = (newPassword) => {
    return PASSWORD_REGEX_LOWERCASE.test(newPassword) ? null : messages_1.errorMessages.passwordNoLowercase;
};
/**
 * Validar la presencia de al menos un carácter especial en la contraseña.
 * @param {string} newPassword - Nueva contraseña a validar.
 * @returns {string | null} - Mensaje de error si no hay un carácter especial, nulo si es válida.
 */
const validateSpecialChar = (newPassword) => {
    return PASSWORD_REGEX_SPECIAL.test(newPassword) ? null : messages_1.errorMessages.passwordNoSpecialChar;
};
/**
 * Validar la nueva contraseña según las reglas establecidas.
 * @param {string} newPassword - Nueva contraseña a validar.
 * @returns {string | null} - Mensaje de error si la contraseña no cumple con las reglas, nulo si es válida.
 */
const validateNewPassword = (newPassword) => {
    const validators = [
        validateMinLength,
        validateNumber,
        validateUppercase,
        validateLowercase,
        validateSpecialChar,
    ];
    for (const validator of validators) {
        const errorMessage = validator(newPassword);
        if (errorMessage !== null) {
            return errorMessage;
        }
    }
    return null; // La contraseña cumple con todas las reglas.
};
/**
 * Encriptar la nueva contraseña y actualizarla en el usuario.
 * @param {AuthModel} user - Usuario al que se le actualizará la contraseña.
 * @param {string} newPassword - Nueva contraseña a encriptar y asignar al usuario.
 * @returns {Promise<void>} - Resuelve cuando la contraseña se ha actualizado correctamente.
 */
const updatePassword = async (user, newPassword) => {
    const hashedPassword = await bcryptjs_1.default.hash(newPassword, 10);
    user.password = hashedPassword;
};
/**
 * Limpiar la contraseña aleatoria y actualizar la fecha de expiración en el registro de verificación.
 * @param {VerificationModel} verification - Registro de verificación al que se le actualizarán los datos.
 * @returns {Promise<void>} - Resuelve cuando se han actualizado los datos correctamente.
 */
const clearRandomPassword = async (verification) => {
    verification.randomPassword = '';
    verification.verificationCodeExpiration = new Date();
    await verification.save();
};
const resetPassword = async (req, res) => {
    const { usernameOrEmail, randomPassword, newPassword } = req.body;
    try {
        const user = await findUser(usernameOrEmail);
        if (!user) {
            return handleResponse(res, 404, messages_1.errorMessages.userNotFound);
        }
        validateAccountAndVerification(user, res, randomPassword, newPassword);
        await updateAndClearPassword(user, user.verification, newPassword);
        res.json({ msg: messages_1.successMessages.passwordUpdated });
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
        handleResponse(res, 400, messages_1.errorMessages.invalidRandomPassword);
        return;
    }
    const passwordValidationError = validateNewPassword(newPassword);
    if (passwordValidationError) {
        handleResponse(res, 400, passwordValidationError);
    }
};
const handleResponse = (res, statusCode, message) => {
    res.status(statusCode).json({ msg: message });
    throw new Error(message);
};
const findUser = async (usernameOrEmail) => {
    if (EMAIL_REGEX.test(usernameOrEmail)) {
        return await authModel_1.Auth.findOne({ where: { email: usernameOrEmail }, include: [verificationModel_1.Verification] });
    }
    else {
        return await authModel_1.Auth.findOne({ where: { username: usernameOrEmail }, include: [verificationModel_1.Verification] });
    }
};
const validateUserExistence = (user, res) => {
    if (!user) {
        res.status(404).json({ msg: messages_1.errorMessages.userNotFound });
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
const validateRandomPassword = (verification, randomPassword, res) => {
    if (!verification || !isRandomPasswordValid(verification, randomPassword)) {
        res.status(400).json({ msg: messages_1.errorMessages.invalidRandomPassword });
    }
};
const validatePasswordError = (passwordValidationError, res) => {
    if (passwordValidationError) {
        res.status(400).json({ msg: passwordValidationError });
    }
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
    res.status(500).json({ msg: messages_1.errorMessages.serverError, error: error });
};
