import { Request, Response } from 'express';
import { Auth } from '../../../models/authModel';
import { errorMessages, successMessages } from '../../../middleware/messages';
import { Verification } from '../../../models/verificationModel';
import { sendVerificationEmail } from '../../../utils/emailUtils';

const VERIFICATION_CODE_EXPIRATION_HOURS = 24;

const generateVerificationCode = () => Math.floor(100000 + Math.random() * 900000).toString();

const calculateExpirationDate = () => {
  const expirationDate = new Date();
  expirationDate.setHours(expirationDate.getHours() + VERIFICATION_CODE_EXPIRATION_HOURS);
  return expirationDate;
};

const findOrCreateVerificationRecord = async (userId: number) => {
  let verificationRecord = await Verification.findOne({ where: { userId } });

  if (!verificationRecord) {
    verificationRecord = await Verification.create({ userId });
  }

  return verificationRecord;
};

const updateVerificationCodeInfo = async (verificationRecord: any, newVerificationCode: string, expirationDate: Date) => {
  await verificationRecord.update({ verificationCode: newVerificationCode, verificationCodeExpiration: expirationDate });
};

const sendVerificationCodeByEmail = async (email: string, username: string, newVerificationCode: string) => {
  return sendVerificationEmail(email, username, newVerificationCode);
};

const isUserNotVerified = (user: any) => !user || !user.verification.isEmailVerified;

export const resendVerificationCode = async (req: Request, res: Response) => {
  const { username } = req.body;

  try {
    const user: any = await Auth.findOne({ where: { username }, include: [Verification] });

    if (isUserNotVerified(user)) {
      const newVerificationCode = generateVerificationCode();
      const expirationDate = calculateExpirationDate();
      const verificationRecord = await findOrCreateVerificationRecord(user.id);

      await updateVerificationCodeInfo(verificationRecord, newVerificationCode, expirationDate);

      const emailSent = await sendVerificationCodeByEmail(user.email, user.username, newVerificationCode);

      if (emailSent) {
        res.json({
          msg: successMessages.verificationCodeResent,
        });
      } else {
        res.status(500).json({
          msg: errorMessages.emailVerificationError,
        });
      }
    } else {
      res.status(400).json({
        msg: errorMessages.userAlreadyVerified,
      });
    }
  } catch (error) {
    res.status(500).json({
      msg: errorMessages.databaseError,
      error,
    });
  }
};
