import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { Auth, AuthModel } from '../../../../models/authModel';
import { Verification, VerificationModel } from '../../../../models/verificationModel';
import { errorMessages, successMessages } from '../../../../middleware/messages';

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
const findUserByUsernameOrEmail = async (usernameOrEmail: string): Promise<AuthModel | null> => {
    if (EMAIL_REGEX.test(usernameOrEmail)) {
        return await Auth.findOne({ where: { email: usernameOrEmail }, include: [Verification] });
    } else {
        return await Auth.findOne({ where: { username: usernameOrEmail }, include: [Verification] });
    }
};

/**
 * Verificar si la cuenta del usuario está verificada.
 * @param {AuthModel} user - Usuario para verificar.
 * @returns {boolean} - True si la cuenta está verificada, false de lo contrario.
 */
const isAccountVerified = (user: AuthModel): boolean => {
    const verification: VerificationModel | null = (user as any).verification;

    // Retornar false si no hay registro de verificación o la cuenta no está verificada
    return verification ? (verification.isEmailVerified && verification.isPhoneVerified) : false;
};


/**
 * Validar la contraseña aleatoria y el tiempo de expiración.
 * @param {VerificationModel} verification - Registro de verificación.
 * @param {string} randomPassword - Contraseña aleatoria proporcionada.
 * @returns {boolean} - True si la contraseña aleatoria y el tiempo son válidos, false de lo contrario.
 */
const isRandomPasswordValid = (verification: VerificationModel, randomPassword: string): boolean => {
    return verification.randomPassword === randomPassword && verification.verificationCodeExpiration >= new Date();
};

/**
 * Validar la longitud mínima de la contraseña.
 * @param {string} newPassword - Nueva contraseña a validar.
 * @returns {string | null} - Mensaje de error si la longitud es insuficiente, nulo si es válida.
 */
const validateMinLength = (newPassword: string): string | null => {
    return newPassword.length < PASSWORD_MIN_LENGTH ? errorMessages.passwordTooShort : null;
};

/**
 * Validar la presencia de al menos un número en la contraseña.
 * @param {string} newPassword - Nueva contraseña a validar.
 * @returns {string | null} - Mensaje de error si no hay un número, nulo si es válida.
 */
const validateNumber = (newPassword: string): string | null => {
    return PASSWORD_REGEX_NUMBER.test(newPassword) ? null : errorMessages.passwordNoNumber;
};

/**
 * Validar la presencia de al menos una mayúscula en la contraseña.
 * @param {string} newPassword - Nueva contraseña a validar.
 * @returns {string | null} - Mensaje de error si no hay una mayúscula, nulo si es válida.
 */
const validateUppercase = (newPassword: string): string | null => {
    return PASSWORD_REGEX_UPPERCASE.test(newPassword) ? null : errorMessages.passwordNoUppercase;
};

/**
 * Validar la presencia de al menos una minúscula en la contraseña.
 * @param {string} newPassword - Nueva contraseña a validar.
 * @returns {string | null} - Mensaje de error si no hay una minúscula, nulo si es válida.
 */
const validateLowercase = (newPassword: string): string | null => {
    return PASSWORD_REGEX_LOWERCASE.test(newPassword) ? null : errorMessages.passwordNoLowercase;
};

/**
 * Validar la presencia de al menos un carácter especial en la contraseña.
 * @param {string} newPassword - Nueva contraseña a validar.
 * @returns {string | null} - Mensaje de error si no hay un carácter especial, nulo si es válida.
 */
const validateSpecialChar = (newPassword: string): string | null => {
    return PASSWORD_REGEX_SPECIAL.test(newPassword) ? null : errorMessages.passwordNoSpecialChar;
};

/**
 * Validar la nueva contraseña según las reglas establecidas.
 * @param {string} newPassword - Nueva contraseña a validar.
 * @returns {string | null} - Mensaje de error si la contraseña no cumple con las reglas, nulo si es válida.
 */
const validateNewPassword = (newPassword: string): string | null => {
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
const updatePassword = async (user: AuthModel, newPassword: string): Promise<void> => {
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    user.password = hashedPassword;
};

/**
 * Limpiar la contraseña aleatoria y actualizar la fecha de expiración en el registro de verificación.
 * @param {VerificationModel} verification - Registro de verificación al que se le actualizarán los datos.
 * @returns {Promise<void>} - Resuelve cuando se han actualizado los datos correctamente.
 */
const clearRandomPassword = async (verification: VerificationModel): Promise<void> => {
    verification.randomPassword = '';
    verification.verificationCodeExpiration = new Date();
    await verification.save();
};

export const resetPassword = async (req: Request, res: Response): Promise<void> => {
    const { usernameOrEmail, randomPassword, newPassword } = req.body;

    try {
        const user = await findUser(usernameOrEmail);

        if (!user) {
            return handleResponse(res, 404, errorMessages.userNotFound);
        }

        validateAccountAndVerification(user, res, randomPassword, newPassword);

        await updateAndClearPassword(user, user.verification, newPassword);

        res.json({ msg: successMessages.passwordUpdated });
    } catch (error) {
        handleServerError(error, res);
    }
};

const validateAccountAndVerification = (user: AuthModel, res: Response, randomPassword: string, newPassword: string): void => {
    validateAccountVerification(user, res);

    const verification = getVerification(user);
    validateRandomPasswordAndNewPassword(verification, res, randomPassword, newPassword);
};

const validateRandomPasswordAndNewPassword = (verification: VerificationModel | null, res: Response, randomPassword: string, newPassword: string): void => {
    if (!verification || !isRandomPasswordValid(verification, randomPassword)) {
        handleResponse(res, 400, errorMessages.invalidRandomPassword);
        return;
    }

    const passwordValidationError = validateNewPassword(newPassword);
    if (passwordValidationError) {
        handleResponse(res, 400, passwordValidationError);
    }
};

const handleResponse = (res: Response, statusCode: number, message: string): void => {
    res.status(statusCode).json({ msg: message });
    throw new Error(message);
};



const findUser = async (usernameOrEmail: string): Promise<AuthModel | null> => {
    if (EMAIL_REGEX.test(usernameOrEmail)) {
        return await Auth.findOne({ where: { email: usernameOrEmail }, include: [Verification] });
    } else {
        return await Auth.findOne({ where: { username: usernameOrEmail }, include: [Verification] });
    }
};

const validateUserExistence = (user: AuthModel | null, res: Response): void => {
    if (!user) {
        res.status(404).json({ msg: errorMessages.userNotFound });
        
    }
};

const validateAccountVerification = (user: AuthModel, res: Response): void => {
    if (!isAccountVerified(user)) {
        res.status(400).json({ msg: errorMessages.unverifiedAccount });
       
    }
};

const getVerification = (user: AuthModel): VerificationModel | null => {
    return (user as any).verification;
};

const validateRandomPassword = (verification: VerificationModel | null, randomPassword: string, res: Response): void => {
    if (!verification || !isRandomPasswordValid(verification, randomPassword)) {
        res.status(400).json({ msg: errorMessages.invalidRandomPassword });
       
    }
};

const validatePasswordError = (passwordValidationError: string | null, res: Response): void => {
    if (passwordValidationError) {
        res.status(400).json({ msg: passwordValidationError });
       
    }
};

const updateAndClearPassword = async (user: AuthModel, verification: VerificationModel | null, newPassword: string): Promise<void> => {
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    user.password = hashedPassword;

    if (verification) {
        verification.randomPassword = '';
        verification.verificationCodeExpiration = new Date();
        await verification.save();
    }

    await user.save();
};

const handleServerError = (error: any, res: Response): void => {
    console.error('Error al resetear la contraseña:', error);
    res.status(500).json({ msg: errorMessages.serverError, error: error });
};
