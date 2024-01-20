import { Auth } from "../models/authModel";
import { Verification } from "../models/verificationModel";

const MAX_LOGIN_ATTEMPTS = 5; // Número máximo de intentos fallidos antes del bloqueo

/**
 * Desbloquear la cuenta de un usuario en base a su nombre de usuario.
 * @async
 * @param {string} username - El nombre de usuario del usuario cuya cuenta se desbloqueará.
 * @returns {Promise<void>} No devuelve ningún valor explícito, pero desbloquea la cuenta del usuario si es encontrado en la base de datos.
 */
export async function unlockAccount(username: any) {
    try {
      // Buscar al usuario en la base de datos por su nombre de usuario y cargar información de verificación asociada.
      const user = await Auth.findOne({ 
        where: { username: username },
        include: [Verification],
      });
  
      // Verificar si el usuario existe en la base de datos.
      if (!user) {
        console.error('Usuario no encontrado');
        return;
      }
  
      // Restablecer el número de intentos de inicio de sesión fallidos a cero en la tabla Verification.
      await Promise.all([
        Verification.update(
          { loginAttempts: 0 },
          { where: { userId: user.id } }
        ),
      ]);
    } catch (error) {
      console.error('Error al desbloquear la cuenta:', error);
    }
  }
  
  
  
  /**
   * Bloquea la cuenta de un usuario después de múltiples intentos fallidos de inicio de sesión.
   * @async
   * @param {string} username - El nombre de usuario del usuario cuya cuenta se bloqueará.
   * @returns {Promise<void>} No devuelve ningún valor explícito, pero bloquea la cuenta del usuario si es encontrado en la base de datos.
   */
  export async function lockAccount(username: any) {
    try {
      // Buscar al usuario en la base de datos por su nombre de usuario y cargar información de verificación asociada.
      const user = await Auth.findOne({ 
        where: { username: username },
        include: [Verification],
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
      await Promise.all([
        Auth.update(
          { 
            loginAttempts: MAX_LOGIN_ATTEMPTS, 
            verificationCodeExpiration: expirationDate,
            blockExpiration: expirationDate  // Actualiza la fecha de expiración de bloqueo
          },
          { where: { username: username } }
        ),
        Verification.update(
          { 
            loginAttempts: MAX_LOGIN_ATTEMPTS, 
            verificationCodeExpiration: expirationDate,
            blockExpiration: expirationDate  // Actualiza la fecha de expiración de bloqueo
          },
          { where: { userId: user.id } }
        ),
      ]);
    } catch (error) {
      console.error('Error al bloquear la cuenta:', error);
    }
  }
  