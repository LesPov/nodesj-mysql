import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { Auth } from '../../../models/authModel';
import { errorMessages, successMessages } from '../../../middleware/messages';
import { unlockAccount, lockAccount } from '../../../utils/authUtils';

// Máximo de intentos de inicio de sesión permitidos
const MAX_LOGIN_ATTEMPTS = 5;

/**
 * Recupera un usuario de la base de datos por nombre de usuario.
 * @param username - El nombre de usuario a buscar.
 * @returns Una instancia de usuario de la base de datos con detalles de verificación incluidos.
 */
const getUserByUsername = async (username: string) => {
  return await Auth.findOne({
    where: { username: username },
    include: ['verification'],
  });
};

/**
 * Maneja la respuesta cuando un usuario no está verificado.
 * @param res - La respuesta HTTP para la solicitud.
 * @returns Un mensaje de error en formato JSON.
 */
const handleUnverifiedUser = (res: Response) => {
  return res.status(400).json({ msg: errorMessages.userNotVerified });
};

/**
 * Bloquea una cuenta y maneja la respuesta cuando se intenta acceder a una cuenta bloqueada.
 * @param username - El nombre de usuario cuya cuenta se va a bloquear.
 * @param res - La respuesta HTTP para la solicitud.
 * @returns Un mensaje de error en formato JSON.
 */
const handleLockedAccount = async (username: string, res: Response) => {
  await lockAccount(username);
  return res.status(400).json({ msg: errorMessages.accountLocked });
};

/**
 * Maneja la respuesta cuando se ingresa una contraseña incorrecta.
 * @param user - El usuario que intentó iniciar sesión.
 * @param res - La respuesta HTTP para la solicitud.
 * @returns Un mensaje de error en formato JSON con información sobre los intentos de inicio de sesión.
 */
const handleIncorrectPassword = async (user: any, res: Response) => {
  const updatedLoginAttempts = await incrementLoginAttempts(user);

  if (updatedLoginAttempts >= MAX_LOGIN_ATTEMPTS) {
    return handleLockedAccount(user.username, res);
  }

  const errorMessage = errorMessages.incorrectPassword(updatedLoginAttempts);
  return sendBadRequest(res, errorMessage);
};

/**
 * Incrementa el contador de intentos de inicio de sesión de un usuario.
 * @param user - El usuario cuyo contador de intentos de inicio de sesión se incrementará.
 * @returns La cantidad actualizada de intentos de inicio de sesión.
 */
const incrementLoginAttempts = async (user: any): Promise<number> => {
  const updatedLoginAttempts = (user.verification.loginAttempts || 0) + 1;
  await user.verification.update({ loginAttempts: updatedLoginAttempts });
  return updatedLoginAttempts;
};

/**
 * Maneja la respuesta cuando un usuario inicia sesión con éxito.
 * @param user - El usuario que inició sesión.
 * @param res - La respuesta HTTP para la solicitud.
 * @param password - La contraseña utilizada para iniciar sesión.
 * @returns Un mensaje de éxito en formato JSON con el token de autenticación, el ID del usuario, el rol y, opcionalmente, la información de la contraseña.
 */
const handleSuccessfulLogin = (user: any, res: Response, password: string) => {
  const msg = password.length === 8 ? 'Inicio de sesión Recuperación de contraseña' : successMessages.userLoggedIn;
  const token = generateAuthToken(user);
  const userId = user.id;
  const rol = user.rol;
  const passwordorrandomPassword = password.length === 8 ? 'randomPassword' : undefined;

  return res.json({ msg, token, userId, rol, passwordorrandomPassword });
};

/**
 * Genera un token de autenticación JWT para un usuario.
 * @param user - El usuario para el cual se generará el token.
 * @returns El token de autenticación JWT.
 */
const generateAuthToken = (user: any) => {
  return jwt.sign({
    username: user.username,
    rol: user.rol,
    userId: user.id
  }, process.env.SECRET_KEY || 'pepito123');
};

/**
 * Maneja la respuesta para solicitudes inválidas.
 * @param res - La respuesta HTTP para la solicitud.
 * @param msg - El mensaje de error.
 * @returns Un mensaje de error en formato JSON.
 */
const sendBadRequest = (res: Response, msg: string) => res.status(400).json({ msg });

/**
 * Maneja la respuesta para errores de la base de datos.
 * @param res - La respuesta HTTP para la solicitud.
 * @param error - El error de la base de datos.
 * @returns Un mensaje de error en formato JSON con información sobre el error de la base de datos.
 */
const sendDatabaseError = (res: Response, error: any) => res.status(500).json({ msg: errorMessages.databaseError, error });

/**
 * Maneja la solicitud de inicio de sesión de un usuario.
 * @param req - La solicitud HTTP.
 * @param res - La respuesta HTTP.
 * @returns Respuestas de éxito o error en formato JSON, según el resultado del inicio de sesión.
 */
export const loginUser = async (req: Request, res: Response) => {
  const { username, passwordorrandomPassword } = req.body;

  try {
    const user: any = await getUserByUsername(username);

    if (!user) {
      return sendBadRequest(res, errorMessages.userNotExists(username));
    }

    if (!isUserVerified(user, res) || handleBlockExpiration(user, res)) {
      return;
    }

    if (!(await validatePassword(user, passwordorrandomPassword))) {
      return handleIncorrectPassword(user, res);
    }

    await resetLoginAttempts(user);

    return handleSuccessfulLogin(user, res, passwordorrandomPassword);
  } catch (error) {
    return sendDatabaseError(res, error);
  }
};

/**
 * Verifica si un usuario está verificado, es decir, si su correo electrónico y número de teléfono han sido verificados.
 * @param user - El usuario a verificar.
 * @param res - La respuesta HTTP para la solicitud.
 * @returns `true` si el usuario está verificado, `false` si no lo está.
 */
const isUserVerified = (user: any, res: Response) => {
  const isEmailValid = isEmailVerified(user, res);
  const isPhoneValid = isPhoneVerified(user, res);

  return isEmailValid && isPhoneValid;
};

/**
 * Verifica si el correo electrónico de un usuario está verificado.
 * @param user - El usuario a verificar.
 * @param res - La respuesta HTTP para la solicitud.
 * @returns `true` si el correo electrónico está verificado, `false` si no lo está.
 */
const isEmailVerified = (user: any, res: Response) => {
  if (!user.verification.isEmailVerified) {
    handleUnverifiedUser(res);
    return false;
  }
  return true;
};

/**
 * Verifica si el número de teléfono de un usuario está verificado.
 * @param user - El usuario a verificar.
 * @param res - La respuesta HTTP para la solicitud.
 * @returns `true` si el número de teléfono está verificado, `false` si no lo está.
 */
const isPhoneVerified = (user: any, res: Response) => {
  if (!user.verification.isPhoneVerified) {
    res.status(400).json({ msg: errorMessages.numberNotVerified });
    return false;
  }
  return true;
};

/**
 * Maneja la respuesta cuando la cuenta de un usuario está bloqueada debido a un bloqueo activo.
 * @param user - El usuario para el cual se verificará el bloqueo.
 * @param res - La respuesta HTTP para la solicitud.
 * @returns `true` si la cuenta está bloqueada, `false` si no lo está.
 */
const handleBlockExpiration = (user: any, res: Response): boolean => {
  if (isAccountBlocked(user)) {
    const timeLeft = calculateTimeLeft(user.verification.blockExpiration, new Date());
    sendAccountBlockedResponse(res, timeLeft);
    return true;
  }
  return false;
};

/**
 * Verifica si la cuenta de un usuario está bloqueada.
 * @param user - El usuario a verificar.
 * @returns `true` si la cuenta está bloqueada, `false` si no lo está.
 */
const isAccountBlocked = (user: any): boolean => {
  const blockExpiration = user.verification.blockExpiration;
  const currentDate = new Date();
  
  return blockExpiration && blockExpiration > currentDate;
};

/**
 * Maneja la respuesta cuando la cuenta de un usuario está bloqueada, proporcionando el tiempo restante antes del desbloqueo.
 * @param res - La respuesta HTTP para la solicitud.
 * @param timeLeft - El tiempo restante antes del desbloqueo en minutos.
 */
const sendAccountBlockedResponse = (res: Response, timeLeft: string): void => {
  res.status(400).json({ msg: errorMessages.accountLockedv1(timeLeft) });
};

/**
 * Calcula el tiempo restante antes de que se desbloquee la cuenta de un usuario.
 * @param blockExpiration - La fecha y hora en que expira el bloqueo.
 * @param currentDate - La fecha y hora actuales.
 * @returns El tiempo restante en minutos antes de que se desbloquee la cuenta, representado como una cadena.
 */
const calculateTimeLeft = (blockExpiration: Date, currentDate: Date): string => {
  const minutesLeft = Math.ceil((blockExpiration.getTime() - currentDate.getTime()) / (60 * 1000));
  return minutesLeft.toString();
};

/**
 * Restablece el contador de intentos de inicio de sesión de un usuario.
 * @param user - El usuario cuyo contador de intentos de inicio de sesión se restablecerá.
 */
const resetLoginAttempts = async (user: any) => {
  await user.verification.update({ loginAttempts: 0 });
};

/**
 * Valida la contraseña proporcionada por el usuario.
 * @param user - El usuario para el cual se realizará la validación.
 * @param password - La contraseña proporcionada por el usuario.
 * @returns `true` si la contraseña es válida, `false` si no lo es o si se proporciona una contraseña aleatoria.
 */
const validatePassword = async (user: any, password: string) => {
  if (password.length === 8) {
    return password === user.verification.randomPassword;
  } else {
    return await bcrypt.compare(password, user.password);
  }
}; 