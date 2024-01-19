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
exports.newUser = void 0;
const bcrypt_1 = __importDefault(require("bcrypt"));
const authModel_1 = require("../../../models/authModel");
const messages_1 = require("../../../middleware/messages");
const emailVerificationController_1 = require("../email/emailVerificationController");
const generateCode_1 = require("../../../utils/generateCode");
const verificationModel_1 = require("../../../models/verificationModel");
const profileAdminModel_1 = require("../../../models/profileAdminModel");
const PASSWORD_MIN_LENGTH = 10;
const PASSWORD_REGEX_NUMBER = /\d/;
const PASSWORD_REGEX_UPPERCASE = /[A-Z]/;
const PASSWORD_REGEX_LOWERCASE = /[a-z]/;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const VERIFICATION_CODE_EXPIRATION_HOURS = 24;
const newUser = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { username, password, email, rol } = req.body;
    //1. Verificar que todos los campos obligatorios estén presentes en la solicitud
    if (!username || !password || !email || !rol) {
        return res.status(400).json({
            msg: messages_1.errorMessages.requiredFields,
        });
    }
    //2. Validar que la contraseña tenga al menos 8 caracteres
    if (password.length < PASSWORD_MIN_LENGTH) {
        return res.status(400).json({
            msg: messages_1.errorMessages.passwordTooShort,
        });
    }
    //3. Validar que la contraseña contenga al menos un número
    if (!PASSWORD_REGEX_NUMBER.test(password)) {
        return res.status(400).json({
            msg: messages_1.errorMessages.passwordNoNumber,
        });
    }
    //4. Validar que la contraseña contenga al menos una letra mayúscula
    if (!PASSWORD_REGEX_UPPERCASE.test(password)) {
        return res.status(400).json({
            msg: messages_1.errorMessages.passwordNoUppercase,
        });
    }
    //5. Validar que la contraseña contenga al menos una letra minúscula
    if (!PASSWORD_REGEX_LOWERCASE.test(password)) {
        return res.status(400).json({
            msg: messages_1.errorMessages.passwordNoLowercase,
        });
    }
    // 6. Validar que la dirección de correo electrónico sea válida
    if (!EMAIL_REGEX.test(email)) {
        return res.status(400).json({
            msg: messages_1.errorMessages.invalidEmail,
        });
    }
    //7. Validamos si el usuario ya existe en la base de datos
    const user = yield authModel_1.Auth.findOne({ where: { username: username } });
    if (user) {
        return res.status(400).json({
            msg: messages_1.errorMessages.userExists(username),
        });
    }
    //7. Validamos si el usuario ya existe en la base de datos
    const useremail = yield authModel_1.Auth.findOne({ where: { email: email } });
    if (useremail) {
        return res.status(400).json({
            msg: messages_1.errorMessages.userEmailExists(email),
        });
    }
    const hashedPassword = yield bcrypt_1.default.hash(password, 10);
    //8. Generar el código de verificación único
    try {
        // Generar el código de verificación único
        const verificationCode = (0, generateCode_1.generateVerificationCode)();
        //9. Calcular la fecha de expiración (agregar 24 horas a la fecha actual)
        const expirationDate = new Date();
        expirationDate.setHours(expirationDate.getHours() + VERIFICATION_CODE_EXPIRATION_HOURS);
        //10. Guardar usuario en la base de datos con el código de verificación y fecha de expiración
        const newUser = yield authModel_1.Auth.create({
            username: username,
            password: hashedPassword,
            email: email,
            rol: rol,
        });
        yield profileAdminModel_1.UserProfile.create({
            userId: newUser.id, // Asociar con el ID del usuario creado
            firstName: '', // Aquí puedes definir los valores iniciales que quieras para el perfil
            lastName: '',
            // Otros campos del perfil que desees inicializar
        });
        // Crear la entrada de verificación asociada al usuario
        yield verificationModel_1.Verification.create({
            isVerified: false,
            verificationCode: verificationCode,
            verificationCodeExpiration: expirationDate,
            userId: newUser.id, // Usar el ID del usuario recién creado
        });
        // Enviar el código de verificación por correo electrónico
        const verificationEmailSent = yield (0, emailVerificationController_1.sendVerificationEmail)(email, username, verificationCode);
        //15. Crear el mensaje de respuesta basado en el rol del usuario
        let userMessage = '';
        if (rol === 'admin') {
            userMessage = 'administrador';
        }
        else if (rol === 'user') {
            userMessage = 'normal';
        }
        res.json({
            msg: messages_1.successMessages.userRegistered(username, userMessage),
        });
    }
    catch (error) {
        res.status(400).json({
            msg: messages_1.errorMessages.databaseError,
            error,
        });
    }
});
exports.newUser = newUser;
