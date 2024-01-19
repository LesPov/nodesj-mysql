"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendPasswordResetEmail = void 0;
const nodemailer_1 = __importDefault(require("nodemailer"));
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
// Función para enviar el correo de recuperación de contraseña con la nueva contraseña aleatoria
const sendPasswordResetEmail = (email, username, randomPassword) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        // Obtener la ruta absoluta del archivo de plantilla 
        const templatePath = path_1.default.join(__dirname, '../..', 'templates', 'randomPasswordEmail.html');
        // Leer la plantilla HTML desde el archivo 
        const emailTemplate = fs_1.default.readFileSync(templatePath, 'utf-8');
        // Reemplazar el placeholder {{ randomPassword }} con la contraseña aleatoria real
        const personalizedEmail = emailTemplate.replace('{{ username }}', username).replace('{{ randomPassword }}', randomPassword);
        // Crear el transporte de nodemailer globalmente para reutilizarlo
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
            html: personalizedEmail, // Usar el contenido personalizado en el cuerpo del correo
        };
        // Enviar el correo de recuperación de contraseña
        yield transporter.sendMail(mailOptions);
        return true; // Indicar que el correo de recuperación de contraseña fue enviado con éxito
    }
    catch (error) {
        console.error('Error al enviar el correo de recuperación de contraseña:', error);
        return false; // Indicar que hubo un error al enviar el correo de recuperación de contraseña
    }
});
exports.sendPasswordResetEmail = sendPasswordResetEmail;
