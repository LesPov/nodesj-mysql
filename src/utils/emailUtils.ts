import nodemailer from 'nodemailer';
import fs from 'fs';
import path from 'path';

/**
 * Envía un correo electrónico de recuperación de contraseña con una nueva contraseña aleatoria.
 * @param {string} email - Dirección de correo electrónico del destinatario.
 * @param {string} username - Nombre de usuario del destinatario.
 * @param {string} randomPassword - Nueva contraseña aleatoria generada.
 * @returns {Promise<boolean>} - Indica si el correo de recuperación de contraseña se envió con éxito.
 */
export const sendPasswordResetEmail = async (email: string, username: string, randomPassword: string): Promise<boolean> => {
    try {
        const templatePath = path.join(__dirname, '..', 'controllers', 'templates', 'randomPasswordEmail.html');
        const emailTemplate = fs.readFileSync(templatePath, 'utf-8');
        const personalizedEmail = emailTemplate.replace('{{ username }}', username).replace('{{ randomPassword }}', randomPassword);

        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: process.env.MAIL_USER,
                pass: process.env.MAIL_PASS,
            },
            secure: true,
        });

        const mailOptions = {
            from: process.env.MAIL_USER,
            to: email,
            subject: 'Recuperación de Contraseña',
            html: personalizedEmail,
        };

        await transporter.sendMail(mailOptions);

        return true;
    } catch (error) {
        console.error('Error al enviar el correo de recuperación de contraseña:', error);
        return false;
    }
};
