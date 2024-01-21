import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { Auth, AuthModel } from '../../../../models/authModel';
import { Verification, VerificationModel } from '../../../../models/verificationModel';
import { errorMessages, successMessages } from '../../../../middleware/messages';
import { sendPasswordResetEmail } from '../../../../utils/emailUtils';
import { generateRandomPassword } from '../../../../utils/passwordUtils';


const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/////////////////////////////////////////////////////////////envioPasswordReset//////////////////////////////////////////////////////////////////////////

/**
 * Busca al usuario en la base de datos según el nombre de usuario o correo electrónico.
 * @param {string} usernameOrEmail - Nombre de usuario o correo electrónico.
 * @returns {Promise<AuthModel | null>} - Usuario encontrado o nulo si no se encuentra.
 */
const findUser = async (usernameOrEmail: string): Promise<AuthModel | null> => {
    if (EMAIL_REGEX.test(usernameOrEmail)) {
        return await Auth.findOne({ where: { email: usernameOrEmail }, include: [Verification] });
    } else {
        return await Auth.findOne({ where: { username: usernameOrEmail }, include: [Verification] });
    }
};

/**
 * Verifica si la cuenta del usuario está verificada.
 * @param {AuthModel | null} user - Usuario.
 * @returns {boolean} - Indica si la cuenta está verificada.
 */
const isAccountVerified = (user: AuthModel | null): boolean => {
    const verification: VerificationModel | null = (user as any)?.verification;
    return !!verification && verification.isEmailVerified && verification.isPhoneVerified;
};

/**
 * Genera una nueva contraseña aleatoria su expiracion es de 5 min y actualiza el registro de verificación.
 * @param {VerificationModel} verification - Registro de verificación.
 * @returns {string} - Nueva contraseña aleatoria generada.
 */
const generateAndSetRandomPassword = async (verification: VerificationModel): Promise<string> => {
    const randomPassword = generateRandomPassword(8);
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
const validateInput = (usernameOrEmail: string, res: Response): boolean => {
    if (!usernameOrEmail) {
        res.status(400).json({
            msg: errorMessages.missingUsernameOrEmail,
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
const handlePasswordResetLogic = async (user: AuthModel, res: Response): Promise<void> => {
    if (!isAccountVerified(user)) {
        res.status(400).json({
            msg: errorMessages.unverifiedAccount,
        });
    } else {
        const randomPassword = await generateAndSetRandomPassword(user.verification);
        const emailSent = await sendPasswordResetEmail(user.email, user.username, randomPassword);

        res.json({
            msg: successMessages.passwordResetEmailSent,
        });
    }
};
/**
 * Maneja la lógica de solicitud de recuperación de contraseña.
 * @param {Request} req - Objeto de solicitud de Express.
 * @param {Response} res - Objeto de respuesta de Express.
 * @returns {Promise<void>} - Responde con un mensaje y puede enviar un correo electrónico de recuperación de contraseña.
 */
export const requestPasswordReset = async (req: Request, res: Response): Promise<void> => {
    const { usernameOrEmail } = req.body;

    if (!validateInput(usernameOrEmail, res)) {
        return;
    }

    try {
        const user = await findUser(usernameOrEmail);
        await handlePasswordReset(user, res);
    } catch (error) {
        handlePasswordResetError(error, res);
    }
};

/**
 * Maneja la lógica de solicitud de recuperación de contraseña.
 * @param {AuthModel | null} user - Usuario para recuperación de contraseña.
 * @param {Response} res - Objeto de respuesta de Express.
 * @returns {Promise<void>} - Responde con un mensaje y puede enviar un correo electrónico de recuperación de contraseña.
 */
const handlePasswordReset = async (user: AuthModel | null, res: Response): Promise<void> => {
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
    const emailSent = await sendPasswordResetEmail(user.email, user.username, randomPassword);
    
    // Responde con un mensaje de éxito
    successResponse(res, successMessages.passwordResetEmailSent);
};

/**
 * Responde con un mensaje de error cuando no se encuentra el usuario.
 * @param {Response} res - Objeto de respuesta de Express.
 */
const userNotFoundResponse = (res: Response): void => {
    res.status(404).json({
        msg: errorMessages.userNotFound,
    });
};

/**
 * Responde con un mensaje de error cuando la cuenta del usuario no está verificada.
 * @param {Response} res - Objeto de respuesta de Express.
 */
const unverifiedAccountResponse = (res: Response): void => {
    res.status(400).json({
        msg: errorMessages.unverifiedAccount,
    });
};

/**
 * Responde con un mensaje de éxito.
 * @param {Response} res - Objeto de respuesta de Express.
 * @param {string} message - Mensaje de éxito.
 */
const successResponse = (res: Response, message: string): void => {
    res.json({
        msg: message,
    });
};

/**
 * Maneja errores durante el proceso de recuperación de contraseña.
 * @param {any} error - Objeto de error.
 * @param {Response} res - Objeto de respuesta de Express.
 */
const handlePasswordResetError = (error: any, res: Response): void => {
    console.error('Error al solicitar recuperación de contraseña:', error);
    res.status(500).json({
        msg: errorMessages.serverError,
    });
};