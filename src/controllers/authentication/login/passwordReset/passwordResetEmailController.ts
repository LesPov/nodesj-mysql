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
 * @param newPassword - Nueva contraseña a validar.
 * @returns Mensajes de error si la longitud no cumple con las reglas, nulo si es válida.
 */
const validateLength = (newPassword: string): string | null => {
    return newPassword.length < PASSWORD_MIN_LENGTH ? errorMessages.passwordTooShort : null;
};

/**
 * Validar la presencia de al menos una letra mayúscula en la contraseña.
 * @param newPassword - Nueva contraseña a validar.
 * @returns Mensajes de error si no cumple con las reglas, nulo si es válida.
 */
const validateUppercase = (newPassword: string): string | null => {
    return PASSWORD_REGEX_UPPERCASE.test(newPassword) ? null : errorMessages.passwordNoUppercase;
};

/**
 * Validar la presencia de al menos una letra minúscula en la contraseña.
 * @param newPassword - Nueva contraseña a validar.
 * @returns Mensajes de error si no cumple con las reglas, nulo si es válida.
 */
const validateLowercase = (newPassword: string): string | null => {
    return PASSWORD_REGEX_LOWERCASE.test(newPassword) ? null : errorMessages.passwordNoLowercase;
};

/**
 * Validar la presencia de al menos un número en la contraseña.
 * @param newPassword - Nueva contraseña a validar.
 * @returns Mensajes de error si no cumple con las reglas, nulo si es válida.
 */
const validateNumber = (newPassword: string): string | null => {
    return PASSWORD_REGEX_NUMBER.test(newPassword) ? null : errorMessages.passwordNoNumber;
};

/**
 * Validar la presencia de al menos un carácter especial en la contraseña.
 * @param newPassword - Nueva contraseña a validar.
 * @returns Mensajes de error si no cumple con las reglas, nulo si es válida.
 */
const validateSpecialChar = (newPassword: string): string | null => {
    return PASSWORD_REGEX_SPECIAL.test(newPassword) ? null : errorMessages.passwordNoSpecialChar;
};
/**
 * Validar la nueva contraseña según las reglas establecidas.
 * @param newPassword - Nueva contraseña a validar.
 * @returns Mensajes de error si la contraseña no cumple con las reglas, nulo si es válida.
 */
const validateNewPassword = (newPassword: string): string[] => {
    const errors: string[] = [
        validateLength(newPassword),
        validateUppercase(newPassword),
        validateLowercase(newPassword),
        validateNumber(newPassword),
        validateSpecialChar(newPassword),
    ].filter((error) => error !== null) as string[];

    return errors;
};

/**
 * Controlador para resetear la contraseña mediante el envío de un correo electrónico.
 * @param req - Objeto de solicitud.
 * @param res - Objeto de respuesta.
 */
export const resetPassword = async (req: Request, res: Response): Promise<void> => {
    const { usernameOrEmail, randomPassword, newPassword } = req.body;

    try {
        const user = await findUser(usernameOrEmail);

        if (!user) {
            handleResponse(res, 404, { msg: errorMessages.userNotFound });
            return;
        }

        validateAndResetPassword(user, res, randomPassword, newPassword);

    } catch (error) {
        handleServerError(error, res);
    }
};

/**
 * Valida y actualiza la contraseña del usuario.
 * @param user - Objeto de modelo de usuario.
 * @param res - Objeto de respuesta.
 * @param randomPassword - Contraseña aleatoria proporcionada.
 * @param newPassword - Nueva contraseña a establecer.
 */
const validateAndResetPassword = async (user: AuthModel, res: Response, randomPassword: string, newPassword: string): Promise<void> => {
    try {
        validateAccountAndVerification(user, res, randomPassword, newPassword);
        await updateAndClearPassword(user, user.verification, newPassword);

        if (!res.headersSent) {
            res.status(200).json({ msg: successMessages.passwordUpdated });
        }
    } catch (error) {
        handleServerError(error, res);
    }
};



const validateAccountAndVerification = (user: AuthModel, res: Response, randomPassword: string, newPassword: string): void => {
    validateAccountVerification(user, res);

    const verification = getVerification(user);
    validateRandomPasswordAndNewPassword(verification, res, randomPassword, newPassword);
};


const validateRandomPassword = (verification: VerificationModel | null, res: Response, randomPassword: string): boolean => {
    if (!verification || !isRandomPasswordValid(verification, randomPassword)) {
        handleResponse(res, 400, { msg: errorMessages.invalidRandomPassword });
        return false;
    }
    return true;
};

const validatePasswordErrors = (res: Response, newPassword: string): string[] => {
    const passwordValidationErrors = validateNewPassword(newPassword);
    if (passwordValidationErrors.length > 0) {
        handleResponse(res, 400, { msg: errorMessages.passwordValidationFailed, errors: passwordValidationErrors });
        return passwordValidationErrors;
    }
    return [];
};

const validateRandomPasswordAndNewPassword = (verification: VerificationModel | null, res: Response, randomPassword: string, newPassword: string): void => {
    if (!validateRandomPassword(verification, res, randomPassword)) {
        return;
    }

    const passwordErrors = validatePasswordErrors(res, newPassword);
    if (passwordErrors.length > 0) {
        return;
    }
};



const handleResponse = (res: Response, statusCode: number, response: { msg: string, errors?: string[] }): void => {
    res.status(statusCode).json(response);
};


const findUser = async (usernameOrEmail: string): Promise<AuthModel | null> => {
    if (EMAIL_REGEX.test(usernameOrEmail)) {
        return await Auth.findOne({ where: { email: usernameOrEmail }, include: [Verification] });
    } else {
        return await Auth.findOne({ where: { username: usernameOrEmail }, include: [Verification] });
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
    if (!res.headersSent) {
        res.status(500).json({ msg: errorMessages.serverError, error: error });
    }
};