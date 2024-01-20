import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { Auth } from '../../../models/authModel';
import { errorMessages, successMessages } from '../../../middleware/messages';
import { sendVerificationEmail } from '../email/emailVerificationController';
import { generateVerificationCode } from '../../../utils/generateCode';
import { Verification } from '../../../models/verificationModel';
import { UserProfile } from '../../../models/profileAdminModel';


const PASSWORD_MIN_LENGTH = 10;
const PASSWORD_REGEX_NUMBER = /\d/;
const PASSWORD_REGEX_UPPERCASE = /[A-Z]/;
const PASSWORD_REGEX_LOWERCASE = /[a-z]/;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const VERIFICATION_CODE_EXPIRATION_HOURS = 24;


export const newUser = async (req: Request, res: Response) => {
  const { username, password, email, rol } = req.body;

  //1. Verificar que todos los campos obligatorios estén presentes en la solicitud
  if (!username || !password || !email || !rol) {
    return res.status(400).json({
      msg: errorMessages.requiredFields,
    });
  }

  //2. Validar que la contraseña tenga al menos 8 caracteres
  if (password.length < PASSWORD_MIN_LENGTH) {
    return res.status(400).json({
      msg: errorMessages.passwordTooShort,
    });
  }

  //3. Validar que la contraseña contenga al menos un número
  if (!PASSWORD_REGEX_NUMBER.test(password)) {
    return res.status(400).json({
      msg: errorMessages.passwordNoNumber,
    });
  }

  //4. Validar que la contraseña contenga al menos una letra mayúscula
  if (!PASSWORD_REGEX_UPPERCASE.test(password)) {
    return res.status(400).json({
      msg: errorMessages.passwordNoUppercase,
    });
  }

  //5. Validar que la contraseña contenga al menos una letra minúscula
  if (!PASSWORD_REGEX_LOWERCASE.test(password)) {
    return res.status(400).json({
      msg: errorMessages.passwordNoLowercase,
    });
  }

  // 6. Validar que la dirección de correo electrónico sea válida
  if (!EMAIL_REGEX.test(email)) {
    return res.status(400).json({
      msg: errorMessages.invalidEmail,
    });
  }

  //7. Validamos si el usuario ya existe en la base de datos
  const user = await Auth.findOne({ where: { username: username } });

  if (user) {
    return res.status(400).json({
      msg: errorMessages.userExists(username),
    });
  }
  //7. Validamos si el usuario ya existe en la base de datos
  const useremail = await Auth.findOne({ where: { email: email } });

  if (useremail) {
    return res.status(400).json({
      msg: errorMessages.userEmailExists(email),
    });
  }
  const hashedPassword = await bcrypt.hash(password, 10);

  //8. Generar el código de verificación único
  try {
    // Generar el código de verificación único
    const verificationCode = generateVerificationCode();

    //9. Calcular la fecha de expiración (agregar 24 horas a la fecha actual)
    const expirationDate = new Date();
    expirationDate.setHours(expirationDate.getHours() + VERIFICATION_CODE_EXPIRATION_HOURS);

    //10. Guardar usuario en la base de datos con el código de verificación y fecha de expiración
    const newUser = await Auth.create({
      username: username,
      password: hashedPassword,
      email: email,
      rol: rol,
  });

  await UserProfile.create({
    userId: newUser.id, // Asociar con el ID del usuario creado
    firstName: '', // Aquí puedes definir los valores iniciales que quieras para el perfil
    lastName: '',
    // Otros campos del perfil que desees inicializar
  });

    // Crear la entrada de verificación asociada al usuario
    await Verification.create({
      isVerified: false,
      verificationCode: verificationCode, 
      verificationCodeExpiration: expirationDate,
      userId: newUser.id, // Usar el ID del usuario recién creado
    });
    // Enviar el código de verificación por correo electrónico
    const verificationEmailSent = await sendVerificationEmail(email, username, verificationCode);

    //15. Crear el mensaje de respuesta basado en el rol del usuario
    let userMessage = '';
    if (rol === 'admin') {
      userMessage = 'administrador';
    } else if (rol === 'user') {
      userMessage = 'normal';
    }

    res.json({
      msg: successMessages.userRegistered(username, userMessage),
    });
  } catch (error) {
    res.status(400).json({
      msg: errorMessages.databaseError,
      error,
    });
  }
};

