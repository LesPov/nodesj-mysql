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
exports.loginUser = void 0;
const bcrypt_1 = __importDefault(require("bcrypt"));
const authModel_1 = require("../../../models/authModel");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const messages_1 = require("../../../middleware/messages");
const verificationModel_1 = require("../../../models/verificationModel");
const MAX_LOGIN_ATTEMPTS = 5; // Número máximo de intentos fallidos antes del bloqueo
// Función para manejar el inicio de sesión de un usuario
const loginUser = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { username, passwordorrandomPassword } = req.body; // Obtener el nombre de usuario y la contraseña de la solicitud
    try {
        // Buscar al usuario en la base de datos
        const user = yield authModel_1.Auth.findOne({
            where: { username: username },
            include: [verificationModel_1.Verification] // Incluir información de verificación asociada al usuario
        });
        // Si el usuario no existe, devolver un mensaje de error
        if (!user) {
            return res.status(400).json({
                msg: messages_1.errorMessages.userNotExists(username),
            });
        }
        // Verificar si el correo electrónico del usuario está verificado
        if (!user.verification.isEmailVerified) {
            return res.status(400).json({
                msg: messages_1.errorMessages.userNotVerified,
            });
        }
        // Verificar si el teléfono del usuario está verificado
        if (!user.verification.isPhoneVerified) {
            return res.status(400).json({
                msg: messages_1.errorMessages.phoneVerificationRequired,
            });
        }
        // Verificar si el usuario ha excedido el número máximo de intentos de inicio de sesión
        if (user.loginAttempts >= MAX_LOGIN_ATTEMPTS) {
            const currentDate = new Date();
            if (user.verification.blockExpiration && user.verification.blockExpiration > currentDate) {
                const timeLeft = Math.ceil((user.verification.blockExpiration.getTime() - currentDate.getTime()) / (60 * 1000));
                return res.status(400).json({
                    msg: `La cuenta está bloqueada temporalmente debido a múltiples intentos fallidos. Inténtalo de nuevo más tarde. Tiempo restante: ${timeLeft} minutos`,
                });
            }
            else {
                // Bloquear la cuenta nuevamente si el bloqueo ha expirado
                yield lockAccount(username);
            }
        }
        let passwordValid = false;
        if (passwordorrandomPassword.length === 8) {
            passwordValid = passwordorrandomPassword === user.verification.randomPassword;
        }
        else {
            passwordValid = yield bcrypt_1.default.compare(passwordorrandomPassword, user.password);
        }
        // Si la contraseña no es válida
        if (!passwordValid) {
            const updatedLoginAttempts = (user.verification.loginAttempts || 0) + 1;
            yield verificationModel_1.Verification.update({ loginAttempts: updatedLoginAttempts }, // Actualizar loginAttempts en la tabla Verification
            { where: { userId: user.id } });
            // Si se excede el número máximo de intentos, bloquear la cuenta
            if (updatedLoginAttempts >= MAX_LOGIN_ATTEMPTS) {
                yield lockAccount(username); // Bloquear la cuenta
                return res.status(400).json({
                    msg: messages_1.errorMessages.accountLocked,
                });
            }
            return res.status(400).json({
                msg: messages_1.errorMessages.incorrectPassword(updatedLoginAttempts),
            });
        }
        // Si la contraseña es válida, restablecer los intentos de inicio de sesión
        yield verificationModel_1.Verification.update({ loginAttempts: 0 }, { where: { userId: user.id } });
        if (user.verification.blockExpiration) {
            const currentDate = new Date();
            if (user.verification.blockExpiration > currentDate) {
                const timeLeft = Math.ceil((user.verification.blockExpiration.getTime() - currentDate.getTime()) / (60 * 1000));
                return res.status(400).json({
                    msg: `La cuenta está bloqueada temporalmente debido a múltiples intentos fallidos. Inténtalo de nuevo más tarde. Tiempo restante: ${timeLeft} minutos`,
                });
            }
        }
        // Generar un token de autenticación
        const token = jsonwebtoken_1.default.sign({
            username: username,
            rol: user.rol,
            userId: user.id // Incluye el userId en el token
        }, process.env.SECRET_KEY || 'pepito123');
        if (passwordorrandomPassword.length === 8) {
            // Si se usó una contraseña aleatoria, generamos un token para la recuperación de contraseña
            const resetPasswordToken = jsonwebtoken_1.default.sign({
                username: username,
                rol: user.rol, // Incluir el rol en el token para utilizarlo posteriormente
                userId: user.id // Incluye el userId en el token
            }, process.env.SECRET_KEY || 'pepito123', { expiresIn: '1h' } // Cambia el tiempo de expiración según tus necesidades
            );
            return res.json({
                msg: 'Inicio de sesión Recuperación de contraseña',
                token: resetPasswordToken,
                passwordorrandomPassword: 'randomPassword'
            });
        }
        else {
            // Devolver el token y el rol del usuario
            return res.json({
                msg: messages_1.successMessages.userLoggedIn,
                token: token,
                userId: user.id, // Devuelve el userId en la respuesta
                rol: user.rol,
            });
        }
    }
    catch (error) {
        // Manejar errores de base de datos
        res.status(500).json({
            msg: messages_1.errorMessages.databaseError,
            error,
        });
    }
});
exports.loginUser = loginUser;
/**
 * Desbloquear la cuenta de un usuario en base a su nombre de usuario.
 * @async
 * @param {string} username - El nombre de usuario del usuario cuya cuenta se desbloqueará.
 * @returns {Promise<void>} No devuelve ningún valor explícito, pero desbloquea la cuenta del usuario si es encontrado en la base de datos.
 */
function unlockAccount(username) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            // Buscar al usuario en la base de datos por su nombre de usuario y cargar información de verificación asociada.
            const user = yield authModel_1.Auth.findOne({
                where: { username: username },
                include: [verificationModel_1.Verification],
            });
            // Verificar si el usuario existe en la base de datos.
            if (!user) {
                console.error('Usuario no encontrado');
                return;
            }
            // Restablecer el número de intentos de inicio de sesión fallidos a cero en la tabla Verification.
            yield Promise.all([
                verificationModel_1.Verification.update({ loginAttempts: 0 }, { where: { userId: user.id } }),
            ]);
        }
        catch (error) {
            console.error('Error al desbloquear la cuenta:', error);
        }
    });
}
/**
 * Bloquea la cuenta de un usuario después de múltiples intentos fallidos de inicio de sesión.
 * @async
 * @param {string} username - El nombre de usuario del usuario cuya cuenta se bloqueará.
 * @returns {Promise<void>} No devuelve ningún valor explícito, pero bloquea la cuenta del usuario si es encontrado en la base de datos.
 */
function lockAccount(username) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            // Buscar al usuario en la base de datos por su nombre de usuario y cargar información de verificación asociada.
            const user = yield authModel_1.Auth.findOne({
                where: { username: username },
                include: [verificationModel_1.Verification],
            });
            // Verificar si el usuario existe en la base de datos.
            if (!user) {
                console.error('Usuario no encontrado');
                return;
            }
            // Calcular la fecha de expiración del bloqueo (3 minutos a partir de la fecha y hora actual).
            const currentDate = new Date();
            const expirationDate = new Date(currentDate.getTime() + 3 * 60 * 1000); // Bloqueo por 3 minutos
            // Actualizar la información en las tablas 'Auth' y 'Verification' para reflejar el bloqueo de la cuenta.
            yield Promise.all([
                authModel_1.Auth.update({
                    loginAttempts: MAX_LOGIN_ATTEMPTS,
                    verificationCodeExpiration: expirationDate,
                    blockExpiration: expirationDate // Actualiza la fecha de expiración de bloqueo
                }, { where: { username: username } }),
                verificationModel_1.Verification.update({
                    loginAttempts: MAX_LOGIN_ATTEMPTS,
                    verificationCodeExpiration: expirationDate,
                    blockExpiration: expirationDate // Actualiza la fecha de expiración de bloqueo
                }, { where: { userId: user.id } }),
            ]);
        }
        catch (error) {
            console.error('Error al bloquear la cuenta:', error);
        }
    });
}
