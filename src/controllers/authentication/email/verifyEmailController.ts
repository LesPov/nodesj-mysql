import { Request, Response } from 'express';
import { Auth } from '../../../models/authModel';
import { errorMessages, successMessages } from '../../../middleware/messages';
import { Verification } from '../../../models/verificationModel';

const findUserByUsername = async (username: string) => {
  return Auth.findOne({ where: { username: username }, include: [Verification] });
};

const isUserAlreadyVerified = (user: any) => {
  return user.isEmailVerified;
};

const isVerificationCodeExpired = (user: any, currentDate: Date) => {
  return user.verificationCodeExpiration && user.verificationCodeExpiration < currentDate;
};

const isInvalidVerificationCode = (user: any, verificationCode: string) => {
  return user.verification.verificationCode !== verificationCode.trim();
};

const markEmailAsVerified = async (userId: number) => {
  await Verification.update({ isEmailVerified: true }, { where: { userId } });
};

const markUserAsVerified = async (userId: number) => {
  await Verification.update({ isVerified: true }, { where: { userId } });
};

const checkUserVerificationStatus = (user: any) => {
  if (isUserAlreadyVerified(user)) {
    throw new Error(errorMessages.userAlreadyVerified);
  }
};

const checkVerificationCodeExpiration = (user: any, currentDate: Date) => {
  if (isVerificationCodeExpired(user, currentDate)) {
    throw new Error(errorMessages.verificationCodeExpired);
  }
};

const checkInvalidVerificationCode = (user: any, verificationCode: string) => {
  if (isInvalidVerificationCode(user, verificationCode)) {
    throw new InvalidVerificationCodeError(errorMessages.invalidVerificationCode);
  }
};

const handleEmailVerification = async (userId: number) => {
  await markEmailAsVerified(userId);
};

const handleUserVerification = async (userId: number, isPhoneVerified: boolean) => {
  if (isPhoneVerified) {
    await markUserAsVerified(userId);
  }
};

const handleVerification = async (user: any, verificationCode: string, currentDate: Date) => {
  checkUserVerificationStatus(user);
  checkVerificationCodeExpiration(user, currentDate);
  checkInvalidVerificationCode(user, verificationCode);

  await handleEmailVerification(user.id);
  await handleUserVerification(user.id, user.isPhoneVerified);
};

class UnauthorizedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'UnauthorizedError';
  }
}

class ForbiddenError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ForbiddenError';
  }
}

class InvalidVerificationCodeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidVerificationCodeError';
  }
}

export const verifyUser = async (req: Request, res: Response) => {
  const { username, verificationCode } = req.body;

  try {
    const user = await findUserByUsername(username);

    if (!user) {
      return res.status(400).json({
        msg: errorMessages.userNotExists(username),
      });
    }

    const currentDate = new Date();
    await handleVerification(user, verificationCode, currentDate);

    res.json({
      msg: successMessages.userVerified,
    });
  } catch (error: any) {
    if (error instanceof InvalidVerificationCodeError) {
      return res.status(403).json({
        msg: error.message,
      });
    } else if (error instanceof UnauthorizedError) {
      return res.status(401).json({
        msg: error.message,
      });
    }

    res.status(400).json({
      msg: errorMessages.databaseError,
      error: error.message,
    });
  }
};
