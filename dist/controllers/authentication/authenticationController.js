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
exports.resetPassword = exports.requestPasswordReset = exports.unlockAccount = exports.loginUser = exports.newUser = void 0;
const bcrypt_1 = __importDefault(require("bcrypt"));
const authModel_1 = require("../../models/authModel");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const messages_1 = require("../../middleware/messages");
const emailVerificationController_1 = require("./email/emailVerificationController");
const generateCode_1 = require("../../utils/generateCode");
const passwordResetEmailController_1 = require("./login/passwordReset/passwordResetEmailController");
const PASSWORD_MIN_LENGTH = 8;
const PASSWORD_REGEX_NUMBER = /\d/;
const PASSWORD_REGEX_UPPERCASE = /[A-Z]/;
const PASSWORD_REGEX_LOWERCASE = /[a-z]/;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const VERIFICATION_CODE_EXPIRATION_HOURS = 24;
//1: Registro
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
    const user = yield authModel_1.User.findOne({ where: { username: username } });
    if (user) {
        return res.status(400).json({
            msg: messages_1.errorMessages.userExists(username),
        });
    }
    //7. Validamos si el usuario ya existe en la base de datos
    const useremail = yield authModel_1.User.findOne({ where: { email: email } });
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
        yield authModel_1.User.create({
            username: username,
            password: hashedPassword,
            email: email,
            rol: rol,
            verificationCode: verificationCode,
            verificationCodeExpiration: expirationDate,
            isVerified: false,
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
//2: Inici o de Sesion
const loginUser = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { username, password } = req.body;
    // Validamos si el usuario existe en la base de datos
    const user = yield authModel_1.User.findOne({ where: { username: username } });
    if (!user) {
        return res.status(400).json({
            msg: messages_1.errorMessages.userNotExists(username),
        });
    }
    // Verificamos si el usuario ha verificado su correo electrónico
    if (!user.isEmailVerified) {
        return res.status(400).json({
            msg: messages_1.errorMessages.userNotVerified,
        });
    }
    // Verificamos si el usuario ha verificado su número de teléfono
    if (!user.isPhoneVerified) {
        return res.status(400).json({
            msg: messages_1.errorMessages.phoneVerificationRequired,
        });
    }
    // Verificar si la cuenta está bloqueada debido a intentos fallidos
    if (user.loginAttempts >= 5) {
        // Si la cuenta está bloqueada, verificamos si ha pasado el tiempo de bloqueo
        const currentDate = new Date();
        if (user.verificationCodeExpiration && user.verificationCodeExpiration > currentDate) {
            // Si aún está dentro del tiempo de bloqueo, respondemos con un mensaje de error
            return res.status(400).json({
                msg: messages_1.errorMessages.accountLocked,
            });
        }
        else {
            // Si ha pasado el tiempo de bloqueo, restablecemos el contador y permitimos el inicio de sesión
            yield (0, exports.unlockAccount)(username);
        }
    }
    // Validamos password
    const passwordValid = yield bcrypt_1.default.compare(password, user.password);
    if (!passwordValid) {
        // Incrementar el contador de intentos fallidos
        yield authModel_1.User.update({ loginAttempts: user.loginAttempts + 1 }, { where: { username: username } });
        return res.status(400).json({
            msg: messages_1.errorMessages.incorrectPassword(user.loginAttempts + 1),
        });
    }
    // Si la contraseña es válida, restablecer el contador de intentos de inicio de sesión fallidos
    yield authModel_1.User.update({ loginAttempts: 0 }, { where: { username: username } });
    // Generamos token 
    const token = jsonwebtoken_1.default.sign({
        username: username,
        rol: user.rol, // Incluir el rol en el token para utilizarlo posteriormente
    }, process.env.SECRET_KEY || 'pepito123');
    // Enviamos solo el token y el rol en la respuesta
    res.json({
        msg: messages_1.successMessages.userLoggedIn,
        token: token,
        rol: user.rol,
    });
});
exports.loginUser = loginUser;
const unlockAccount = (username) => __awaiter(void 0, void 0, void 0, function* () {
    // Establecer un tiempo de bloqueo de 15 minutos
    const unlockTime = new Date();
    unlockTime.setMinutes(unlockTime.getMinutes() + 15);
    // Actualizar la columna de intentos de inicio de sesión fallidos y restablecer el contador a cero
    yield authModel_1.User.update({ loginAttempts: 0, verificationCodeExpiration: unlockTime }, { where: { username: username } });
});
exports.unlockAccount = unlockAccount;
// ... importaciones y código previo ...
// Nueva función para solicitar recuperación de contraseña
const requestPasswordReset = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { usernameOrEmail } = req.body;
    if (!usernameOrEmail) {
        return res.status(400).json({
            msg: messages_1.errorMessages.missingUsernameOrEmail,
        });
    }
    let user = null;
    if (EMAIL_REGEX.test(usernameOrEmail)) {
        user = yield authModel_1.User.findOne({ where: { email: usernameOrEmail } });
    }
    else {
        user = yield authModel_1.User.findOne({ where: { username: usernameOrEmail } });
    }
    if (!user) {
        return res.status(404).json({
            msg: messages_1.errorMessages.userNotFound,
        });
    }
    // Verificar si el correo electrónico o número de teléfono han sido verificados
    if (!user.isEmailVerified && !user.isPhoneVerified) {
        return res.status(400).json({
            msg: messages_1.errorMessages.unverifiedAccount,
        });
    }
    // Generar contraseña aleatoria
    const randomPassword = generateRandomPassword(10); // Longitud de contraseña aleatoria
    // Calcular tiempo de expiración (por ejemplo, 5 minutos)
    const expirationTime = new Date();
    expirationTime.setMinutes(expirationTime.getMinutes() + 10); // Cambia a 5 para tu necesidad
    // Actualizar la contraseña aleatoria y tiempo de expiración en la base de datos
    user.randomPassword = randomPassword;
    user.verificationCodeExpiration = expirationTime;
    yield user.save();
    // Enviar el correo con la contraseña aleatoria
    const emailSent = yield (0, passwordResetEmailController_1.sendPasswordResetEmail)(user.email, usernameOrEmail, randomPassword);
    res.json({
        msg: messages_1.successMessages.passwordResetEmailSent,
    });
});
exports.requestPasswordReset = requestPasswordReset;
// Nueva función para cambiar la contraseña
const resetPassword = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { usernameOrEmail, randomPassword, newPassword } = req.body;
    // Buscar el usuario por username o email
    let user = null;
    if (EMAIL_REGEX.test(usernameOrEmail)) {
        user = yield authModel_1.User.findOne({ where: { email: usernameOrEmail } });
    }
    else {
        user = yield authModel_1.User.findOne({ where: { username: usernameOrEmail } });
    }
    if (!user) {
        return res.status(404).json({
            msg: messages_1.errorMessages.userNotFound,
        });
    }
    // Verificar la contraseña aleatoria enviada por correo y su tiempo de expiración
    if (user.randomPassword !== randomPassword || user.verificationCodeExpiration < new Date()) {
        return res.status(400).json({
            msg: messages_1.errorMessages.invalidRandomPassworde,
        });
    }
    // Cambiar la contraseña a la nueva contraseña proporcionada
    const hashedPassword = yield bcrypt_1.default.hash(newPassword, 10);
    user.password = hashedPassword;
    // Reiniciar la contraseña aleatoria y tiempo de expiración en la base de datos
    user.randomPassword = null;
    user.verificationCodeExpiration = null;
    yield user.save();
    res.json({
        msg: messages_1.successMessages.passwordUpdated,
    });
});
exports.resetPassword = resetPassword;
// Función para generar una contraseña aleatoria
function generateRandomPassword(length) {
    const characters = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let randomPassword = '';
    for (let i = 0; i < length; i++) {
        const randomIndex = Math.floor(Math.random() * characters.length);
        randomPassword += characters.charAt(randomIndex);
    }
    return randomPassword;
}
