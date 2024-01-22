// Importación de módulos y dependencias
import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { Auth } from '../../../models/authModel';
import { UserProfile } from '../../../models/profileAdminModel';
import { Verification } from '../../../models/verificationModel';
import { errorMessages, successMessages } from '../../../middleware/messages';
import { sendVerificationEmail } from '../email/emailVerificationController';
import { generateVerificationCode } from '../../../utils/generateCode';

// Constantes y expresiones regulares
const PASSWORD_MIN_LENGTH = 10;
const PASSWORD_REGEX_NUMBER = /\d/;
const PASSWORD_REGEX_UPPERCASE = /[A-Z]/;
const PASSWORD_REGEX_LOWERCASE = /[a-z]/;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const VERIFICATION_CODE_EXPIRATION_HOURS = 24;

/**
 * Controlador para registrar un nuevo usuario.
 * @param req - Objeto de solicitud.
 * @param res - Objeto de respuesta.
 */
export const newUser = async (req: Request, res: Response) => {
  try {
    // Extraer datos del cuerpo de la solicitud
    const { username, password, email, rol } = req.body;

    // Validar la entrada del usuario
    validateInput(username, password, email, rol);

    // Validar los requisitos de la contraseña
    const passwordValidationErrors = validatePasswordRequirements(password);
    handlePasswordValidationErrors(passwordValidationErrors, res);

    // Validar el formato del correo electrónico
    validateEmail(email);

    // Verificar si el usuario ya existe
    const existingUserError = await checkExistingUser(username, email);
    handleExistingUserError(existingUserError, res);

    // Generar hash de la contraseña
    const hashedPassword = await bcrypt.hash(password, 10);

    // Crear un nuevo usuario en la base de datos
    const newUser = await createNewUser(username, hashedPassword, email, rol);

    // Inicializar el perfil de usuario
    await initializeUserProfile(newUser.id);

    // Generar y guardar el código de verificación
    const verificationCode = await generateAndSaveVerificationCode(newUser.id, email);

    // Enviar correo electrónico de verificación
    await sendVerificationEmail(email, username, verificationCode);

    // Obtener el mensaje de usuario según el rol
    const userMessage = getRoleMessage(rol);

    // Responder con un mensaje de éxito
    res.json({
      msg: successMessages.userRegistered(username, userMessage),
    });
  } catch (error) {
    // Manejar errores generales del servidor
    handleServerError(error, res);
  }
};

/**
 * Validar la entrada del usuario.
 * @param username - Nombre de usuario.
 * @param password - Contraseña.
 * @param email - Correo electrónico.
 * @param rol - Rol del usuario.
 */
const validateInput = (username: string, password: string, email: string, rol: string) => {
  const requiredFields = [username, password, email, rol];
  if (requiredFields.some(field => !field)) {
    throw new Error(errorMessages.requiredFields);
  }
};

/**
 * Manejar errores de validación de contraseña.
 * @param errors - Errores de validación de contraseña.
 * @param res - Objeto de respuesta.
 */
const handlePasswordValidationErrors = (errors: string[], res: Response) => {
  if (errors.length > 0) {
    res.status(400).json({
      msg: 'Error en la validación de la contraseña',
      errors: errors,
    });
  }
};

/**
 * Manejar errores de usuario existente.
 * @param error - Mensaje de error si el usuario ya existe.
 * @param res - Objeto de respuesta.
 */
const handleExistingUserError = (error: string | null, res: Response) => {
  if (error) {
    res.status(400).json({
      msg: error,
    });
  }
};

/**
 * Manejar errores generales del servidor.
 * @param error - Error del servidor.
 * @param res - Objeto de respuesta.
 */
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
/**
 * Validar los requisitos de la contraseña.
 * @param password - Contraseña a validar.
 * @returns Errores de validación de contraseña.
 */
const validatePasswordRequirements = (password: string): string[] => {
  const errors: string[] = [];

  validateLength(password, errors);
  validateNumber(password, errors);
  validateUppercase(password, errors);
  validateLowercase(password, errors);

  return errors;
};

/**
 * Validar la longitud de la contraseña.
 * @param password - Contraseña.
 * @param errors - Errores de validación de contraseña.
 */
const validateLength = (password: string, errors: string[]) => {
  if (password.length < PASSWORD_MIN_LENGTH) {
    errors.push(errorMessages.passwordTooShort);
  }
};

/**
 * Validar la presencia de números en la contraseña.
 * @param password - Contraseña.
 * @param errors - Errores de validación de contraseña.
 */
const validateNumber = (password: string, errors: string[]) => {
  if (!PASSWORD_REGEX_NUMBER.test(password)) {
    errors.push(errorMessages.passwordNoNumber);
  }
};

/**
 * Validar la presencia de letras mayúsculas en la contraseña.
 * @param password - Contraseña.
 * @param errors - Errores de validación de contraseña.
 */
const validateUppercase = (password: string, errors: string[]) => {
  if (!PASSWORD_REGEX_UPPERCASE.test(password)) {
    errors.push(errorMessages.passwordNoUppercase);
  }
};

/**
 * Validar la presencia de letras minúsculas en la contraseña.
 * @param password - Contraseña.
 * @param errors - Errores de validación de contraseña.
 */
const validateLowercase = (password: string, errors: string[]) => {
  if (!PASSWORD_REGEX_LOWERCASE.test(password)) {
    errors.push(errorMessages.passwordNoLowercase);
  }
};

/**
 * Validar el formato del correo electrónico.
 * @param email - Correo electrónico a validar.
 */
const validateEmail = (email: string) => {
  if (!EMAIL_REGEX.test(email)) {
    throw new Error(errorMessages.invalidEmail);
  }
};

/**
 * Buscar si ya existe un usuario con un nombre de usuario específico.
 * @param username - Nombre de usuario a buscar.
 * @returns Devuelve true si el usuario existe, de lo contrario, false.
 */
const findExistingUsername = async (username: string): Promise<boolean> => {
  try {
    const existingUsername = await Auth.findOne({ where: { username } });
    return Boolean(existingUsername);
  } catch (error) {
    console.error("Error en findExistingUsername:", error);
    throw errorMessages.databaseError;
  }
};

/**
 * Buscar si ya existe un usuario con un correo electrónico específico.
 * @param email - Correo electrónico a buscar.
 * @returns Devuelve true si el usuario existe, de lo contrario, false.
 */
const findExistingEmail = async (email: string): Promise<boolean> => {
  try {
    const existingEmail = await Auth.findOne({ where: { email } });
    return Boolean(existingEmail);
  } catch (error) {
    console.error("Error en findExistingEmail:", error);
    throw errorMessages.databaseError;
  }
};

/**
 * Comprobar si ya existe un usuario con un nombre de usuario específico.
 * @param username - Nombre de usuario a comprobar.
 * @returns Mensaje de error si el usuario ya existe, de lo contrario, null.
 */
const checkExistingUsername = async (username: string): Promise<string | null> => {
  return (await findExistingUsername(username))
    ? errorMessages.userExists(username)
    : null;
};

/**
 * Comprobar si ya existe un usuario con un correo electrónico específico.
 * @param email - Correo electrónico a comprobar.
 * @returns Mensaje de error si el usuario ya existe, de lo contrario, null.
 */
const checkExistingEmail = async (email: string): Promise<string | null> => {
  return (await findExistingEmail(email))
    ? errorMessages.userEmailExists(email)
    : null;
};

/**
 * Comprobar si ya existe un usuario con un nombre de usuario o correo electrónico específico.
 * @param username - Nombre de usuario a comprobar.
 * @param email - Correo electrónico a comprobar.
 * @returns Mensaje de error si el usuario ya existe, de lo contrario, null.
 */
const checkExistingUser = async (username: string, email: string): Promise<string | null> => {
  return (
    (await checkExistingUsername(username)) ||
    (await checkExistingEmail(email)) ||
    null
  );
};

/**
 * Crear un nuevo usuario en la base de datos.
 * @param username - Nombre de usuario del nuevo usuario.
 * @param hashedPassword - Contraseña cifrada del nuevo usuario.
 * @param email - Correo electrónico del nuevo usuario.
 * @param rol - Rol del nuevo usuario.
 * @returns El nuevo usuario creado.
 */
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

/**
 * Inicializar el perfil de usuario.
 * @param userId - ID del usuario para el cual se inicializará el perfil.
 */
const initializeUserProfile = async (userId: number) => {
  await UserProfile.create({
    userId: userId,
    firstName: '',
    lastName: '',
  });
};

/**
 * Generar y guardar un código de verificación para un usuario.
 * @param userId - ID del usuario para el cual se generará el código.
 * @param email - Correo electrónico del usuario.
 * @returns El código de verificación generado.
 */
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

/**
 * Obtener un mensaje de usuario según el rol.
 * @param rol - Rol del usuario.
 * @returns El mensaje asociado al rol del usuario.
 */
const getRoleMessage = (rol: string) => {
  return rol === 'admin' ? 'administrador' : rol === 'user' ? 'normal' : '';
};