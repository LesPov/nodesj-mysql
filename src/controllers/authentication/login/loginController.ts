import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { Auth } from '../../../models/authModel';
import jwt from 'jsonwebtoken';
import { errorMessages, successMessages } from '../../../middleware/messages';
import { Verification } from '../../../models/verificationModel';


const MAX_LOGIN_ATTEMPTS = 5; // Número máximo de intentos fallidos antes del bloqueo

// Función para manejar el inicio de sesión de un usuario
export const loginUser = async (req: Request, res: Response) => {
  const { username, passwordorrandomPassword } = req.body; // Obtener el nombre de usuario y la contraseña de la solicitud

  try {
    // Buscar al usuario en la base de datos
    const user: any = await Auth.findOne({ 
      where: { username: username },
      include: [Verification] // Incluir información de verificación asociada al usuario
    });

    // Si el usuario no existe, devolver un mensaje de error
    if (!user) {
      return res.status(400).json({
        msg: errorMessages.userNotExists(username),
      });
    }

    // Verificar si el correo electrónico del usuario está verificado
    if (!user.verification.isEmailVerified) {
      return res.status(400).json({
        msg: errorMessages.userNotVerified,
      });
    }

    // Verificar si el teléfono del usuario está verificado
    if (!user.verification.isPhoneVerified) {
      return res.status(400).json({
        msg: errorMessages.phoneVerificationRequired,
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
      } else {
        // Bloquear la cuenta nuevamente si el bloqueo ha expirado
        await lockAccount(username);
      }
    }

    let passwordValid = false;
    if (passwordorrandomPassword.length === 8) {
      passwordValid = passwordorrandomPassword === user.verification.randomPassword;
    } else {
      passwordValid = await bcrypt.compare(passwordorrandomPassword, user.password);
    }

    // Si la contraseña no es válida
    if (!passwordValid) {
      const updatedLoginAttempts = (user.verification.loginAttempts || 0) + 1;
    
      await Verification.update(
        { loginAttempts: updatedLoginAttempts }, // Actualizar loginAttempts en la tabla Verification
        { where: { userId: user.id } } 
      );
    
      // Si se excede el número máximo de intentos, bloquear la cuenta
      if (updatedLoginAttempts >= MAX_LOGIN_ATTEMPTS) {
        await lockAccount(username); // Bloquear la cuenta
        return res.status(400).json({
          msg: errorMessages.accountLocked,
        });
      }
    
      return res.status(400).json({
        msg: errorMessages.incorrectPassword(updatedLoginAttempts),
      });
    }

    // Si la contraseña es válida, restablecer los intentos de inicio de sesión
    await Verification.update(
      { loginAttempts: 0 },
      { where: { userId: user.id } }
    );

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
    const token = jwt.sign(
      {
        username: username,
        rol: user.rol,
        userId: user.id // Incluye el userId en el token

      },
      process.env.SECRET_KEY || 'pepito123'
    );

    if (passwordorrandomPassword.length === 8) {
      // Si se usó una contraseña aleatoria, generamos un token para la recuperación de contraseña
      const resetPasswordToken = jwt.sign(
        {
          username: username,
          rol: user.rol, // Incluir el rol en el token para utilizarlo posteriormente
          userId: user.id // Incluye el userId en el token

        },
        process.env.SECRET_KEY || 'pepito123',
        { expiresIn: '1h' } // Cambia el tiempo de expiración según tus necesidades
      );

      return res.json({
        msg: 'Inicio de sesión Recuperación de contraseña',
        token: resetPasswordToken,
        passwordorrandomPassword: 'randomPassword'
        
      });
    } else {
      // Devolver el token y el rol del usuario
      return res.json({
        msg: successMessages.userLoggedIn,
        token: token,
        userId: user.id, // Devuelve el userId en la respuesta

        rol: user.rol,
      });
    }
  } catch (error) {
    // Manejar errores de base de datos
    res.status(500).json({
      msg: errorMessages.databaseError,
      error,
    });
  }
};


/**
 * Desbloquear la cuenta de un usuario en base a su nombre de usuario.
 * @async
 * @param {string} username - El nombre de usuario del usuario cuya cuenta se desbloqueará.
 * @returns {Promise<void>} No devuelve ningún valor explícito, pero desbloquea la cuenta del usuario si es encontrado en la base de datos.
 */
async function unlockAccount(username: any) {
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
async function lockAccount(username: any) {
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
