import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { Auth } from '../../../models/authModel';
import { UserProfile } from '../../../models/profileAdminModel';
import { Verification } from '../../../models/verificationModel';
import { errorMessages, successMessages } from '../../../middleware/messages';
import { sendVerificationEmail } from '../email/emailVerificationController';
import { generateVerificationCode } from '../../../utils/generateCode';

const PASSWORD_MIN_LENGTH = 10;
const PASSWORD_REGEX_NUMBER = /\d/;
const PASSWORD_REGEX_UPPERCASE = /[A-Z]/;
const PASSWORD_REGEX_LOWERCASE = /[a-z]/;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const VERIFICATION_CODE_EXPIRATION_HOURS = 24;

export const newUser = async (req: Request, res: Response) => {
  try {
    const { username, password, email, rol } = req.body;

    validateInput(username, password, email, rol);

    const passwordValidationErrors = validatePasswordRequirements(password);
    handlePasswordValidationErrors(passwordValidationErrors, res);

    validateEmail(email);

    const existingUserError = await checkExistingUser(username, email);
    handleExistingUserError(existingUserError, res);

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = await createNewUser(username, hashedPassword, email, rol);

    await initializeUserProfile(newUser.id);

    const verificationCode = await generateAndSaveVerificationCode(newUser.id, email);

    await sendVerificationEmail(email, username, verificationCode);

    const userMessage = getRoleMessage(rol);

    res.json({
      msg: successMessages.userRegistered(username, userMessage),
    });
  } catch (error) {
    handleServerError(error, res);
  }
};

const validateInput = (username: string, password: string, email: string, rol: string) => {
  const requiredFields = [username, password, email, rol];
  if (requiredFields.some(field => !field)) {
    throw new Error(errorMessages.requiredFields);
  }
};

const handlePasswordValidationErrors = (errors: string[], res: Response) => {
  if (errors.length > 0) {
    res.status(400).json({
      msg: 'Error en la validación de la contraseña',
      errors: errors,
    });
  }
};

const handleExistingUserError = (error: string | null, res: Response) => {
  if (error) {
    res.status(400).json({
      msg: error,
    });
  }
};

const handleServerError = (error: any, res: Response) => {
  console.error("Error en el controlador newUser:", error);

  // Verificar si ya se ha enviado una respuesta
  if (!res.headersSent) {
    res.status(400).json({
      msg: errorMessages.databaseError,
      error,
    });
  }
};






// Cambios en validatePasswordRequirements
const validatePasswordRequirements = (password: string): string[] => {
  const errors: string[] = [];

  validateLength(password, errors);
  validateNumber(password, errors);
  validateUppercase(password, errors);
  validateLowercase(password, errors);

  return errors;
};

const validateLength = (password: string, errors: string[]) => {
  if (password.length < PASSWORD_MIN_LENGTH) {
    errors.push(errorMessages.passwordTooShort);
  }
};

const validateNumber = (password: string, errors: string[]) => {
  if (!PASSWORD_REGEX_NUMBER.test(password)) {
    errors.push(errorMessages.passwordNoNumber);
  }
};

const validateUppercase = (password: string, errors: string[]) => {
  if (!PASSWORD_REGEX_UPPERCASE.test(password)) {
    errors.push(errorMessages.passwordNoUppercase);
  }
};

const validateLowercase = (password: string, errors: string[]) => {
  if (!PASSWORD_REGEX_LOWERCASE.test(password)) {
    errors.push(errorMessages.passwordNoLowercase);
  }
};

const validateEmail = (email: string) => {
  if (!EMAIL_REGEX.test(email)) {
    throw new Error(errorMessages.invalidEmail);
  }
};




const findExistingUsername = async (username: string): Promise<boolean> => {
  try {
    const existingUsername = await Auth.findOne({ where: { username } });
    return Boolean(existingUsername);
  } catch (error) {
    console.error("Error en findExistingUsername:", error);
    throw errorMessages.databaseError;
  }
};

const findExistingEmail = async (email: string): Promise<boolean> => {
  try {
    const existingEmail = await Auth.findOne({ where: { email } });
    return Boolean(existingEmail);
  } catch (error) {
    console.error("Error en findExistingEmail:", error);
    throw errorMessages.databaseError;
  }
};

const checkExistingUsername = async (username: string): Promise<string | null> => {
  return (await findExistingUsername(username))
    ? errorMessages.userExists(username)
    : null;
};

const checkExistingEmail = async (email: string): Promise<string | null> => {
  return (await findExistingEmail(email))
    ? errorMessages.userEmailExists(email)
    : null;
};

const checkExistingUser = async (username: string, email: string): Promise<string | null> => {
  return (
    (await checkExistingUsername(username)) ||
    (await checkExistingEmail(email)) ||
    null
  );
};



const createNewUser = async (username: string, hashedPassword: string, email: string, rol: string) => {
  try {
    return await Auth.create({
      username: username,
      password: hashedPassword,
      email: email,
      rol: rol,
    });
  } catch (error) {
    console.error("Error en createNewUser:", error);
    throw errorMessages.databaseError; // Propagar el error a la función llamadora
  }
};

const initializeUserProfile = async (userId: number) => {
  await UserProfile.create({
    userId: userId,
    firstName: '',
    lastName: '',
  });
};

const generateAndSaveVerificationCode = async (userId: number, email: string) => {
  const verificationCode = generateVerificationCode();
  const expirationDate = new Date();
  expirationDate.setHours(expirationDate.getHours() + VERIFICATION_CODE_EXPIRATION_HOURS);

  await Verification.create({
    isVerified: false,
    verificationCode: verificationCode,
    verificationCodeExpiration: expirationDate,
    userId: userId,
  });

  return verificationCode;
};

const getRoleMessage = (rol: string) => {
  return rol === 'admin' ? 'administrador' : rol === 'user' ? 'normal' : '';
};

