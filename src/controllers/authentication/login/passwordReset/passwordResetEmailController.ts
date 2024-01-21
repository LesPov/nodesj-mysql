import nodemailer from 'nodemailer';
import fs from 'fs';
import path from 'path';
import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { Auth, AuthModel } from '../../../../models/authModel';
import { Verification, VerificationModel } from '../../../../models/verificationModel'; // Importa el modelo de verificación
import { errorMessages, successMessages } from '../../../../middleware/messages';
import { sendPasswordResetEmail } from '../../../../utils/emailUtils';
import { generateRandomPassword } from '../../../../utils/passwordUtils';

const PASSWORD_MIN_LENGTH = 10;
const PASSWORD_REGEX_NUMBER = /\d/;
const PASSWORD_REGEX_UPPERCASE = /[A-Z]/;
const PASSWORD_REGEX_LOWERCASE = /[a-z]/;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PASSWORD_REGEX_SPECIAL = /[&$@_/-]/;




/**
 * Solicita la recuperación de contraseña para un usuario específico.
 * @param {Request} req - Objeto de solicitud de Express.
 * @param {Response} res - Objeto de respuesta de Express.
 * @returns {Promise<void>} - Responde con un mensaje y puede enviar un correo electrónico de recuperación de contraseña.
 */
export const requestPasswordReset = async (req: Request, res: Response) => {
    const { usernameOrEmail } = req.body;

        // Verifica si se proporcionó un nombre de usuario o una dirección de correo electrónico

    if (!usernameOrEmail) {
        return res.status(400).json({
            msg: errorMessages.missingUsernameOrEmail,
        });
    }

    try {
                // Buscar al usuario en la base de datos según el nombre de usuario o correo electrónico

        let user: AuthModel | null = null;

        if (EMAIL_REGEX.test(usernameOrEmail)) {
            user = await Auth.findOne({ where: { email: usernameOrEmail }, include: [Verification] });
        } else {
            user = await Auth.findOne({ where: { username: usernameOrEmail }, include: [Verification] });
        }

                // Verificar si el usuario no existe


        if (!user) {
            return res.status(404).json({
                msg: errorMessages.userNotFound,
            });
        }

        // Obtener el registro de verificación asociado al usuario

        const verification: VerificationModel | null = (user as any).verification;
        // Verificar si la cuenta del usuario no está verificada

        if (!verification || !verification.isEmailVerified || !verification.isPhoneVerified) {
            return res.status(400).json({
                msg: errorMessages.unverifiedAccount,
            });
        }

        // Generar una nueva contraseña aleatoria
        const randomPassword = generateRandomPassword(8);

        // Establecer un tiempo de expiración para la contraseña aleatoria (5 minutos)

        const expirationTime = new Date();
        expirationTime.setMinutes(expirationTime.getMinutes() + 5); // Expira después de 5 minutos
        
        verification.randomPassword = randomPassword;
        verification.verificationCodeExpiration = expirationTime;
        await verification.save();
        
        // Eliminar la contraseña aleatoria después de 5 minutos
        setTimeout(async () => {
            verification.randomPassword = '';
            await verification.save();
        }, 5 * 60 * 1000); // 5 minutos en milisegundos
        

        // Enviar un correo de recuperación de contraseña al usuario
        const emailSent = await sendPasswordResetEmail(user.email, user.username, randomPassword);

        // Responder con un mensaje de éxito
        res.json({
            msg: successMessages.passwordResetEmailSent,
        });
    } catch (error) {

        // Manejar errores y responder con un mensaje de error en caso de fallo
        console.error('Error al solicitar recuperación de contraseña:', error);
        res.status(500).json({
            msg: errorMessages.serverError,
            error: error,
        });
    }
};



/**
 * Restablece la contraseña de un usuario.
 * @param {Request} req - Objeto de solicitud de Express.
 * @param {Response} res - Objeto de respuesta de Express.
 * @returns {Promise<void>} - Responde con un mensaje indicando si la contraseña se restableció con éxito.
 */
export const resetPassword = async (req: Request, res: Response) => {
    const { usernameOrEmail, randomPassword, newPassword } = req.body;

    try {

        // Buscar al usuario en la base de datos según el nombre de usuario o correo electrónico
        let user: AuthModel | null = null;

        if (EMAIL_REGEX.test(usernameOrEmail)) {
            user = await Auth.findOne({ where: { email: usernameOrEmail }, include: [Verification] });
        } else {
            user = await Auth.findOne({ where: { username: usernameOrEmail }, include: [Verification] });
        }
        
        // Verificar si el usuario no existe
        if (!user) {
            return res.status(404).json({
                msg: errorMessages.userNotFound,
            });
        }

        // Obtener el registro de verificación asociado al usuario
        const verification: VerificationModel | null = (user as any).verification;

        // Verificar si la cuenta del usuario no está verificada
        if (!verification || !verification.isEmailVerified || !verification.isPhoneVerified) {
            return res.status(400).json({
                msg: errorMessages.unverifiedAccount,
            });
        }

        // Verificar si la contraseña aleatoria y el tiempo de expiración son válidos
        if (verification.randomPassword !== randomPassword || verification.verificationCodeExpiration < new Date()) {
            return res.status(400).json({
                msg: errorMessages.invalidRandomPassword,
            });
        }

        // Validar que la nueva contraseña cumpla con las reglas
        if (newPassword.length < PASSWORD_MIN_LENGTH) {
            return res.status(400).json({
                msg: errorMessages.passwordTooShort,
            });
        }

        if (!PASSWORD_REGEX_NUMBER.test(newPassword)) {
            return res.status(400).json({
                msg: errorMessages.passwordNoNumber,
            });
        }

        if (!PASSWORD_REGEX_UPPERCASE.test(newPassword)) {
            return res.status(400).json({
                msg: errorMessages.passwordNoUppercase,
            });
        }

        if (!PASSWORD_REGEX_LOWERCASE.test(newPassword)) {
            return res.status(400).json({
                msg: errorMessages.passwordNoLowercase,
            });
        }

        if (!PASSWORD_REGEX_SPECIAL.test(newPassword)) {
            return res.status(400).json({
                msg: errorMessages.passwordNoSpecialChar,
            });
        }

        // Encriptar la nueva contraseña y actualizarla en el usuario
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        user.password = hashedPassword;

        // Limpiar la contraseña aleatoria y actualizar la fecha de expiración en el registro de verificación
        verification.randomPassword = '';
        verification.verificationCodeExpiration = new Date();

        // Guardar los cambios en el usuario y en el registro de verificación
        await Promise.all([user.save(), verification.save()]);
        
        // Responder con un mensaje de éxito
        res.json({
            msg: successMessages.passwordUpdated,
        });
    } catch (error) {

        // Manejar errores y responder con un mensaje de error en caso de fallo
        console.error('Error al resetear la contraseña:', error);
        res.status(500).json({
            msg: errorMessages.serverError,
            error: error,
        });
    }
};



