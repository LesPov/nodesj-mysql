"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendVerificationEmail = exports.sendPasswordResetEmail = void 0;
const nodemailer_1 = __importDefault(require("nodemailer"));
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
/**
 * Envía un correo electrónico de recuperación de contraseña con una nueva contraseña aleatoria.
 * @param {string} email - Dirección de correo electrónico del destinatario.
 * @param {string} username - Nombre de usuario del destinatario.
 * @param {string} randomPassword - Nueva contraseña aleatoria generada.
 * @returns {Promise<boolean>} - Indica si el correo de recuperación de contraseña se envió con éxito.
 */
const sendPasswordResetEmail = async (email, username, randomPassword) => {
    try {
        const templatePath = path_1.default.join(__dirname, '..', 'controllers', 'templates', 'randomPasswordEmail.html');
        const emailTemplate = fs_1.default.readFileSync(templatePath, 'utf-8');
        const personalizedEmail = emailTemplate.replace('{{ username }}', username).replace('{{ randomPassword }}', randomPassword);
        const transporter = nodemailer_1.default.createTransport({
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
    }
    catch (error) {
        console.error('Error al enviar el correo de recuperación de contraseña:', error);
        return false;
    }
};
exports.sendPasswordResetEmail = sendPasswordResetEmail;
/**
 * Envía un correo de verificación con un código personalizado.
 * @param {string} email - Dirección de correo electrónico del destinatario.
 * @param {string} username - Nombre de usuario asociado al correo.
 * @param {string} verificationCode - Código de verificación generado.
 * @returns {boolean} - True si el correo se envía con éxito, False si hay un error.
 */
const sendVerificationEmail = async (email, username, verificationCode) => {
    try {
        // Obtiene la ruta absoluta del archivo de plantilla de correo electrónico
        const templatePath = path_1.default.join(__dirname, '..', 'controllers', 'templates', 'randomPasswordEmail.html');
        // Lee la plantilla de correo electrónico desde el archivo
        const emailTemplate = fs_1.default.readFileSync(templatePath, 'utf-8');
        // Reemplaza los marcadores {{ username }} y {{ verificationCode }} con los valores reales
        const personalizedEmail = emailTemplate.replace('{{ username }}', username).replace('{{ verificationCode }}', verificationCode);
        // Crea un transporte de nodemailer para reutilizarlo
        const transporter = nodemailer_1.default.createTransport({
            service: 'gmail',
            auth: {
                user: process.env.MAIL_USER,
                pass: process.env.MAIL_PASS,
            },
            secure: true,
        });
        // Registra en la consola el código de verificación enviado
        console.log('Código de verificación enviado:', verificationCode);
        const mailOptions = {
            from: process.env.MAIL_USER,
            to: email,
            subject: 'Verificación de correo electrónico',
            html: personalizedEmail, // Utiliza el contenido personalizado en el cuerpo del correo
        };
        // Envía el correo de verificación
        await transporter.sendMail(mailOptions);
        return true; // Indica que el correo de verificación se envió con éxito
    }
    catch (error) {
        console.error('Error al enviar el correo de verificación:', error);
        return false; // Indica que hubo un error al enviar el correo de verificación
    }
};
exports.sendVerificationEmail = sendVerificationEmail;
