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
Object.defineProperty(exports, "__esModule", { value: true });
exports.lockAccount = exports.unlockAccount = void 0;
const authModel_1 = require("../models/authModel");
const verificationModel_1 = require("../models/verificationModel");
const MAX_LOGIN_ATTEMPTS = 5; // Número máximo de intentos fallidos antes del bloqueo
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
exports.unlockAccount = unlockAccount;
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
exports.lockAccount = lockAccount;
