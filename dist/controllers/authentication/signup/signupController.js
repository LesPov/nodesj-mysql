"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.newUser = void 0;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const authModel_1 = require("../../../models/authModel");
const profileAdminModel_1 = require("../../../models/profileAdminModel");
const verificationModel_1 = require("../../../models/verificationModel");
const messages_1 = require("../../../middleware/messages");
const emailVerificationController_1 = require("../email/emailVerificationController");
const generateCode_1 = require("../../../utils/generateCode");
const PASSWORD_MIN_LENGTH = 10;
const PASSWORD_REGEX_NUMBER = /\d/;
const PASSWORD_REGEX_UPPERCASE = /[A-Z]/;
const PASSWORD_REGEX_LOWERCASE = /[a-z]/;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const VERIFICATION_CODE_EXPIRATION_HOURS = 24;
const newUser = async (req, res) => {
    try {
        const { username, password, email, rol } = req.body;
        validateInput(username, password, email, rol);
        const passwordValidationErrors = validatePasswordRequirements(password);
        handlePasswordValidationErrors(passwordValidationErrors, res);
        validateEmail(email);
        const existingUserError = await checkExistingUser(username, email);
        handleExistingUserError(existingUserError, res);
        const hashedPassword = await bcryptjs_1.default.hash(password, 10);
        const newUser = await createNewUser(username, hashedPassword, email, rol);
        await initializeUserProfile(newUser.id);
        const verificationCode = await generateAndSaveVerificationCode(newUser.id, email);
        await (0, emailVerificationController_1.sendVerificationEmail)(email, username, verificationCode);
        const userMessage = getRoleMessage(rol);
        res.json({
            msg: messages_1.successMessages.userRegistered(username, userMessage),
        });
    }
    catch (error) {
        handleServerError(error, res);
    }
};
exports.newUser = newUser;
const validateInput = (username, password, email, rol) => {
    const requiredFields = [username, password, email, rol];
    if (requiredFields.some(field => !field)) {
        throw new Error(messages_1.errorMessages.requiredFields);
    }
};
const handlePasswordValidationErrors = (errors, res) => {
    if (errors.length > 0) {
        res.status(400).json({
            msg: 'Error en la validación de la contraseña',
            errors: errors,
        });
    }
};
const handleExistingUserError = (error, res) => {
    if (error) {
        res.status(400).json({
            msg: error,
        });
    }
};
const handleServerError = (error, res) => {
    console.error("Error en el controlador newUser:", error);
    // Verificar si ya se ha enviado una respuesta
    if (!res.headersSent) {
        res.status(400).json({
            msg: messages_1.errorMessages.databaseError,
            error,
        });
    }
};
// Cambios en validatePasswordRequirements
const validatePasswordRequirements = (password) => {
    const errors = [];
    validateLength(password, errors);
    validateNumber(password, errors);
    validateUppercase(password, errors);
    validateLowercase(password, errors);
    return errors;
};
const validateLength = (password, errors) => {
    if (password.length < PASSWORD_MIN_LENGTH) {
        errors.push(messages_1.errorMessages.passwordTooShort);
    }
};
const validateNumber = (password, errors) => {
    if (!PASSWORD_REGEX_NUMBER.test(password)) {
        errors.push(messages_1.errorMessages.passwordNoNumber);
    }
};
const validateUppercase = (password, errors) => {
    if (!PASSWORD_REGEX_UPPERCASE.test(password)) {
        errors.push(messages_1.errorMessages.passwordNoUppercase);
    }
};
const validateLowercase = (password, errors) => {
    if (!PASSWORD_REGEX_LOWERCASE.test(password)) {
        errors.push(messages_1.errorMessages.passwordNoLowercase);
    }
};
const validateEmail = (email) => {
    if (!EMAIL_REGEX.test(email)) {
        throw new Error(messages_1.errorMessages.invalidEmail);
    }
};
const findExistingUsername = async (username) => {
    try {
        const existingUsername = await authModel_1.Auth.findOne({ where: { username } });
        return Boolean(existingUsername);
    }
    catch (error) {
        console.error("Error en findExistingUsername:", error);
        throw messages_1.errorMessages.databaseError;
    }
};
const findExistingEmail = async (email) => {
    try {
        const existingEmail = await authModel_1.Auth.findOne({ where: { email } });
        return Boolean(existingEmail);
    }
    catch (error) {
        console.error("Error en findExistingEmail:", error);
        throw messages_1.errorMessages.databaseError;
    }
};
const checkExistingUsername = async (username) => {
    return (await findExistingUsername(username))
        ? messages_1.errorMessages.userExists(username)
        : null;
};
const checkExistingEmail = async (email) => {
    return (await findExistingEmail(email))
        ? messages_1.errorMessages.userEmailExists(email)
        : null;
};
const checkExistingUser = async (username, email) => {
    return ((await checkExistingUsername(username)) ||
        (await checkExistingEmail(email)) ||
        null);
};
const createNewUser = async (username, hashedPassword, email, rol) => {
    try {
        return await authModel_1.Auth.create({
            username: username,
            password: hashedPassword,
            email: email,
            rol: rol,
        });
    }
    catch (error) {
        console.error("Error en createNewUser:", error);
        throw messages_1.errorMessages.databaseError; // Propagar el error a la función llamadora
    }
};
const initializeUserProfile = async (userId) => {
    await profileAdminModel_1.UserProfile.create({
        userId: userId,
        firstName: '',
        lastName: '',
    });
};
const generateAndSaveVerificationCode = async (userId, email) => {
    const verificationCode = (0, generateCode_1.generateVerificationCode)();
    const expirationDate = new Date();
    expirationDate.setHours(expirationDate.getHours() + VERIFICATION_CODE_EXPIRATION_HOURS);
    await verificationModel_1.Verification.create({
        isVerified: false,
        verificationCode: verificationCode,
        verificationCodeExpiration: expirationDate,
        userId: userId,
    });
    return verificationCode;
};
const getRoleMessage = (rol) => {
    return rol === 'admin' ? 'administrador' : rol === 'user' ? 'normal' : '';
};
