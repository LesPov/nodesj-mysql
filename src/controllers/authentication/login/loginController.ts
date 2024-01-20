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
    include: ['verification'],
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
  const updatedLoginAttempts = await incrementLoginAttempts(user);

  if (updatedLoginAttempts >= MAX_LOGIN_ATTEMPTS) {
    return handleLockedAccount(user.username, res);
  }

  const errorMessage = errorMessages.incorrectPassword(updatedLoginAttempts);
  return sendBadRequest(res, errorMessage);
};

const incrementLoginAttempts = async (user: any): Promise<number> => {
  const updatedLoginAttempts = (user.verification.loginAttempts || 0) + 1;
  await user.verification.update({ loginAttempts: updatedLoginAttempts });
  return updatedLoginAttempts;
};


const handleSuccessfulLogin = (user: any, res: Response, password: string) => {
  const msg = password.length === 8 ? 'Inicio de sesión Recuperación de contraseña' : successMessages.userLoggedIn;
  const token = generateAuthToken(user);
  const userId = user.id;
  const rol = user.rol;
  const passwordorrandomPassword = password.length === 8 ? 'randomPassword' : undefined;

  return res.json({ msg, token, userId, rol, passwordorrandomPassword });
};

const generateAuthToken = (user: any) => {
  return jwt.sign({
    username: user.username,
    rol: user.rol,
    userId: user.id
  }, process.env.SECRET_KEY || 'pepito123');
};

const sendBadRequest = (res: Response, msg: string) => res.status(400).json({ msg });
const sendDatabaseError = (res: Response, error: any) => res.status(500).json({ msg: errorMessages.databaseError, error });

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

const isUserVerified = (user: any, res: Response) => {
  const isEmailValid = isEmailVerified(user, res);
  const isPhoneValid = isPhoneVerified(user, res);

  return isEmailValid && isPhoneValid;
};


const isEmailVerified = (user: any, res: Response) => {
  if (!user.verification.isEmailVerified) {
    handleUnverifiedUser(res);
    return false;
  }
  return true;
};

const isPhoneVerified = (user: any, res: Response) => {
  if (!user.verification.isPhoneVerified) {
    res.status(400).json({ msg: errorMessages.numberNotVerified });
    return false;
  }
  return true;
};

const handleBlockExpiration = (user: any, res: Response): boolean => {
  if (isAccountBlocked(user)) {
    const timeLeft = calculateTimeLeft(user.verification.blockExpiration, new Date());
    sendAccountBlockedResponse(res, timeLeft);
    return true;
  }
  return false;
};

const isAccountBlocked = (user: any): boolean => {
  const blockExpiration = user.verification.blockExpiration;
  const currentDate = new Date();
  
  return blockExpiration && blockExpiration > currentDate;
};

const sendAccountBlockedResponse = (res: Response, timeLeft: string): void => {
  res.status(400).json({ msg: errorMessages.accountLockedv1(timeLeft) });
};

const calculateTimeLeft = (blockExpiration: Date, currentDate: Date): string => {
  const minutesLeft = Math.ceil((blockExpiration.getTime() - currentDate.getTime()) / (60 * 1000));
  return minutesLeft.toString();
};



const resetLoginAttempts = async (user: any) => {
  await user.verification.update({ loginAttempts: 0 });
};


const validatePassword = async (user: any, password: string) => {
  if (password.length === 8) {
    return password === user.verification.randomPassword;
  } else {
    return await bcrypt.compare(password, user.password);
  }
}; 