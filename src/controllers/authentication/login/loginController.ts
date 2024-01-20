import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { Auth } from '../../../models/authModel';
import jwt from 'jsonwebtoken';
import { errorMessages, successMessages } from '../../../middleware/messages';
import { Verification } from '../../../models/verificationModel';
import { unlockAccount, lockAccount } from '../../../utils/authUtils';

const MAX_LOGIN_ATTEMPTS = 5;

export const loginUser = async (req: Request, res: Response) => {
  const { username, passwordorrandomPassword } = req.body;

  try {
    const user: any = await Auth.findOne({
      where: { username: username },
      include: [Verification],
    });

    if (!user) {
      return res.status(400).json({
        msg: errorMessages.userNotExists(username),
      });
    }

    if (!user.verification.isEmailVerified) {
      return res.status(400).json({
        msg: errorMessages.userNotVerified,
      });
    }

    if (!user.verification.isPhoneVerified) {
      return res.status(400).json({
        msg: errorMessages.phoneVerificationRequired,
      });
    }

    if (user.loginAttempts >= MAX_LOGIN_ATTEMPTS) {
      const currentDate = new Date();
      if (user.verification.blockExpiration && user.verification.blockExpiration > currentDate) {
        const timeLeft = Math.ceil((user.verification.blockExpiration.getTime() - currentDate.getTime()) / (60 * 1000));
        return res.status(400).json({
          msg: `La cuenta está bloqueada temporalmente debido a múltiples intentos fallidos. Inténtalo de nuevo más tarde. Tiempo restante: ${timeLeft} minutos`,
        });
      } else {
        await lockAccount(username);
      }
    }

    let passwordValid = false;
    if (passwordorrandomPassword.length === 8) {
      passwordValid = passwordorrandomPassword === user.verification.randomPassword;
    } else {
      passwordValid = await bcrypt.compare(passwordorrandomPassword, user.password);
    }

    if (!passwordValid) {
      const updatedLoginAttempts = (user.verification.loginAttempts || 0) + 1;

      await Verification.update(
        { loginAttempts: updatedLoginAttempts },
        { where: { userId: user.id } }
      );

      if (updatedLoginAttempts >= MAX_LOGIN_ATTEMPTS) {
        await lockAccount(username);
        return res.status(400).json({
          msg: errorMessages.accountLocked,
        });
      }

      return res.status(400).json({
        msg: errorMessages.incorrectPassword(updatedLoginAttempts),
      });
    }

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

    const token = jwt.sign(
      {
        username: username,
        rol: user.rol,
        userId: user.id
      },
      process.env.SECRET_KEY || 'pepito123'
    );

    if (passwordorrandomPassword.length === 8) {
      const resetPasswordToken = jwt.sign(
        {
          username: username,
          rol: user.rol,
          userId: user.id
        },
        process.env.SECRET_KEY || 'pepito123',
        { expiresIn: '1h' }
      );

      return res.json({
        msg: 'Inicio de sesión Recuperación de contraseña',
        token: resetPasswordToken,
        passwordorrandomPassword: 'randomPassword'
      });
    } else {
      return res.json({
        msg: successMessages.userLoggedIn,
        token: token,
        userId: user.id,
        rol: user.rol,
      });
    }
  } catch (error) {
    res.status(500).json({
      msg: errorMessages.databaseError,
      error,
    });
  }
};
