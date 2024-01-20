import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { Auth } from '../../../models/authModel';
import { errorMessages, successMessages } from '../../../middleware/messages';
import { unlockAccount, lockAccount } from '../../../utils/authUtils';

const MAX_LOGIN_ATTEMPTS = 5;

const getUserByUsername = async (username: string) => {
  return await Auth.findOne({
    where: { username: username },
    include: ['verification'], // Cambiado para evitar la carga innecesaria de todos los atributos
  });
};

const handleUnverifiedUser = (res: Response) => {
  return res.status(400).json({ msg: errorMessages.userNotVerified });
};

const handleLockedAccount = async (username: string, res: Response) => {
  await lockAccount(username);
  return res.status(400).json({ msg: errorMessages.accountLocked });
};

const handleIncorrectPassword = async (user: any, res: Response) => {
  const updatedLoginAttempts = (user.verification.loginAttempts || 0) + 1;
  await user.verification.update({ loginAttempts: updatedLoginAttempts });

  if (updatedLoginAttempts >= MAX_LOGIN_ATTEMPTS) {
    return handleLockedAccount(user.username, res);
  }

  return res.status(400).json({ msg: errorMessages.incorrectPassword(updatedLoginAttempts) });
};

const handleSuccessfulLogin = (user: any, res: Response, password: string) => {
  return res.json({
    msg: password.length === 8 ? 'Inicio de sesión Recuperación de contraseña' : successMessages.userLoggedIn,
    token: generateAuthToken(user),
    userId: user.id,
    rol: user.rol,
    passwordorrandomPassword: password.length === 8 ? 'randomPassword' : undefined,
  });
};

const generateAuthToken = (user: any) => {
  return jwt.sign({
    username: user.username,
    rol: user.rol,
    userId: user.id
  }, process.env.SECRET_KEY || 'pepito123');
};

export const loginUser = async (req: Request, res: Response) => {
  const { username, passwordorrandomPassword } = req.body;

  try {
    const user: any = await getUserByUsername(username);

    if (!user) {
      return res.status(400).json({ msg: errorMessages.userNotExists(username) });
    }

    if (!user.verification.isEmailVerified) {
      return handleUnverifiedUser(res);
    }

    if (!user.verification.isPhoneVerified) {
      return res.status(400).json({ msg: errorMessages.phoneVerificationRequired });
    }

    if (user.loginAttempts >= MAX_LOGIN_ATTEMPTS) {
      const timeLeft = handleBlockExpiration(user, res);
      if (timeLeft !== undefined) {
        return res.status(400).json({
          msg: `La cuenta está bloqueada temporalmente debido a múltiples intentos fallidos. Inténtalo de nuevo más tarde. Tiempo restante: ${timeLeft} minutos`,
        });
      }
    }

    const passwordValid = await validatePassword(user, passwordorrandomPassword);
    if (!passwordValid) {
      return handleIncorrectPassword(user, res);
    }

    await user.verification.update({ loginAttempts: 0 });

    const timeLeft = handleBlockExpiration(user, res);
    if (timeLeft !== undefined) {
      return res.status(400).json({
        msg: `La cuenta está bloqueada temporalmente debido a múltiples intentos fallidos. Inténtalo de nuevo más tarde. Tiempo restante: ${timeLeft} minutos`,
      });
    }

    return handleSuccessfulLogin(user, res, passwordorrandomPassword);
  } catch (error) {
    res.status(500).json({ msg: errorMessages.databaseError, error });
  }
};

const handleBlockExpiration = (user: any, res: Response) => {
  const currentDate = new Date();
  if (user.verification.blockExpiration && user.verification.blockExpiration > currentDate) {
    return Math.ceil((user.verification.blockExpiration.getTime() - currentDate.getTime()) / (60 * 1000));
  }
  return undefined;
};

const validatePassword = async (user: any, password: string) => {
  if (password.length === 8) {
    return password === user.verification.randomPassword;
  } else {
    return await bcrypt.compare(password, user.password);
  }
};
