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
/////////////////////////////////////////////////////Restablece la contraseña de un usuario.///////////////////////////////////////////////////////////
/**
 * Restablece la contraseña de un usuario.
 * @param {Request} req - Objeto de solicitud de Express.
 * @param {Response} res - Objeto de respuesta de Express.
 * @returns {Promise<void>} - Responde con un mensaje indicando si la contraseña se restableció con éxito.
 */
const resetPassword = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { usernameOrEmail, randomPassword, newPassword } = req.body;
    try {
        // Buscar al usuario en la base de datos según el nombre de usuario o correo electrónico
        let user = null;
        if (EMAIL_REGEX.test(usernameOrEmail)) {
            user = yield authModel_1.Auth.findOne({ where: { email: usernameOrEmail }, include: [verificationModel_1.Verification] });
        }
        else {
            user = yield authModel_1.Auth.findOne({ where: { username: usernameOrEmail }, include: [verificationModel_1.Verification] });
        }
        // Verificar si el usuario no existe
        if (!user) {
            return res.status(404).json({
                msg: messages_1.errorMessages.userNotFound,
            });
        }
        // Obtener el registro de verificación asociado al usuario
        const verification = user.verification;
        // Verificar si la cuenta del usuario no está verificada
        if (!verification || !verification.isEmailVerified || !verification.isPhoneVerified) {
            return res.status(400).json({
                msg: messages_1.errorMessages.unverifiedAccount,
            });
        }
        // Verificar si la contraseña aleatoria y el tiempo de expiración son válidos
        if (verification.randomPassword !== randomPassword || verification.verificationCodeExpiration < new Date()) {
            return res.status(400).json({
                msg: messages_1.errorMessages.invalidRandomPassword,
            });
        }
        // Validar que la nueva contraseña cumpla con las reglas
        if (newPassword.length < PASSWORD_MIN_LENGTH) {
            return res.status(400).json({
                msg: messages_1.errorMessages.passwordTooShort,
            });
        }
        if (!PASSWORD_REGEX_NUMBER.test(newPassword)) {
            return res.status(400).json({
                msg: messages_1.errorMessages.passwordNoNumber,
            });
        }
        if (!PASSWORD_REGEX_UPPERCASE.test(newPassword)) {
            return res.status(400).json({
                msg: messages_1.errorMessages.passwordNoUppercase,
            });
        }
        if (!PASSWORD_REGEX_LOWERCASE.test(newPassword)) {
            return res.status(400).json({
                msg: messages_1.errorMessages.passwordNoLowercase,
            });
        }
        if (!PASSWORD_REGEX_SPECIAL.test(newPassword)) {
            return res.status(400).json({
                msg: messages_1.errorMessages.passwordNoSpecialChar,
            });
        }
        // Encriptar la nueva contraseña y actualizarla en el usuario
        const hashedPassword = yield bcryptjs_1.default.hash(newPassword, 10);
        user.password = hashedPassword;
        // Limpiar la contraseña aleatoria y actualizar la fecha de expiración en el registro de verificación
        verification.randomPassword = '';
        verification.verificationCodeExpiration = new Date();
        // Guardar los cambios en el usuario y en el registro de verificación
        yield Promise.all([user.save(), verification.save()]);
        // Responder con un mensaje de éxito
        res.json({
            msg: messages_1.successMessages.passwordUpdated,
        });
    }
    catch (error) {
        // Manejar errores y responder con un mensaje de error en caso de fallo
        console.error('Error al resetear la contraseña:', error);
        res.status(500).json({
            msg: messages_1.errorMessages.serverError,
            error: error,
        });
    }
});
exports.resetPassword = resetPassword;
