import { Request, Response } from 'express';
import { Auth } from '../../../models/authModel';
import { Verification } from '../../../models/verificationModel';
import twilio from 'twilio';
import { errorMessages, successMessages } from '../../../middleware/messages';
import { generateVerificationCode } from '../../../utils/generateCode';

const PHONE_VERIFICATION_LOCK_TIME_MINUTES = 15;
/**
 * Controlador para enviar un código de verificación por mensaje de texto (SMS).
 * @param {Request} req - Objeto de solicitud de Express.
 * @param {Response} res - Objeto de respuesta de Express.
 * @returns {Response} - Respuesta JSON con un mensaje indicando el estado de la operación.
 */
export const sendVerificationCode = async (req: Request, res: Response) => {
  // Extraer el nombre de usuario y el número de teléfono del cuerpo de la solicitud
  const { username, phoneNumber } = req.body;

  // Verificar si se proporcionaron tanto el nombre de usuario como el número de teléfono
  if (!username || !phoneNumber) {
    return res.status(400).json({
      msg: errorMessages.requiredFields,
    });
  }

  try {
    // Buscar un usuario con el nombre de usuario proporcionado en la base de datos
    const user: any = await Auth.findOne({ where: { username: username } });

    // Si no se encuentra un usuario, devolver un mensaje de error
    if (!user) {
      return res.status(400).json({
        msg: errorMessages.userNotExists(username),
      });
    }

    // Verificar si el usuario ya está verificado a través de su correo electrónico o si ya ha sido autenticado
    if (user.isVerified || user.isEmailVerified) {
      return res.status(400).json({
        msg: errorMessages.userAlreadyVerified,
      });
    }

    // Verificar si el usuario ya tiene un número de teléfono asociado
    if (user.phoneNumber) {
      return res.status(400).json({
        msg: errorMessages.phoneNumberExists,
      });
    }

    // Verificar si ya hay otro usuario con el mismo número de teléfono
    const existingUserWithPhoneNumber = await Auth.findOne({ where: { phoneNumber: phoneNumber } });
    if (existingUserWithPhoneNumber) {
      return res.status(400).json({
        msg: errorMessages.phoneNumberInUse,
      });
    }

    // Generar un código de verificación
    const verificationCode = generateVerificationCode();

    // Calcular la fecha de expiración del código de verificación
    const expirationDate = new Date();
    expirationDate.setMinutes(expirationDate.getMinutes() + PHONE_VERIFICATION_LOCK_TIME_MINUTES);

    // Crear un registro en la tabla 'Verification' si no existe
    let verificationRecord = await Verification.findOne({ where: { userId: user.id } });
    if (!verificationRecord) {
      verificationRecord = await Verification.create({ userId: user.id });
    }

    // Almacenar el código de verificación generado en el registro de 'Verification'
    await verificationRecord.update({
      verificationCode: verificationCode,
      verificationCodeExpiration: expirationDate,
    });

    // Actualizar la información del usuario (número de teléfono y estado de verificación de teléfono)
    await Auth.update(
      {
        phoneNumber: phoneNumber,
        isPhoneVerified: false,
      },
      { where: { username: username } }
    );

    // Enviar el código de verificación por SMS usando Twilio
    const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
    client.messages
      .create({
        body: `Tu código de verificación es: ${verificationCode}`,
        from: process.env.TWILIO_PHONE_NUMBER,
        to: phoneNumber,
      })
      .then((message) => {
        console.log('Código de verificación enviado por SMS:', message.sid);
        res.json({
          msg: successMessages.verificationCodeSent,
        });
      })
      .catch((error) => {
        console.error('Error al enviar el código de verificación por SMS:', error);
        res.status(500).json({
          msg: errorMessages.phoneNumberVerificationError,
          error,
        });
      });
  } catch (error) {
    // Manejar errores de la base de datos u otros errores inesperados
    res.status(500).json({
      msg: errorMessages.databaseError,
      error,
    });
  }
};
/**
 * Verifica el número de teléfono de un usuario mediante el código de verificación recibido por SMS.
 * @function
 * @async
 * @param {Request} req - Objeto de solicitud HTTP.
 * @param {Response} res - Objeto de respuesta HTTP.
 * @throws {Error} Si hay un error al interactuar con la base de datos.
 * @returns {Response} - Mensaje de éxito o error.
 */
export const verifyPhoneNumber = async (req: Request, res: Response) => {
  // Extraer datos de la solicitud
  const { username, phoneNumber, verificationCode } = req.body;

  try {
    // Buscar al usuario en la base de datos
    const user: any = await Auth.findOne({ where: { username: username } });

    // Validar si el usuario existe
    if (!user) {
      return res.status(400).json({
        msg: errorMessages.userNotExists(username),
      });
    }

    // Validar si el teléfono ya está verificado
    if (user.isPhoneVerified) {
      return res.status(400).json({
        msg: errorMessages.phoneAlreadyVerified,
      });
    }

    // Validar si el número de teléfono coincide con el almacenado en la base de datos
    if (user.phoneNumber !== phoneNumber) {
      return res.status(400).json({
        msg: errorMessages.incorrectPhoneNumber,
      });
    }

    // Buscar el registro de verificación correspondiente al usuario
    let verificationRecord = await Verification.findOne({ where: { userId: user.id } });

    // Validar si el código de verificación proporcionado coincide con el almacenado en la base de datos
    if (!verificationRecord || verificationRecord.verificationCode !== verificationCode) {
      return res.status(400).json({
        msg: errorMessages.invalidVerificationCode,
      });
    }

    // Marcar el número de teléfono como verificado en la tabla Verification
    await verificationRecord.update({ isPhoneVerified: true });

    // Verificar si el correo electrónico del usuario ya está verificado
    if (verificationRecord.isEmailVerified) {
      await verificationRecord.update({ isVerified: true });
    }

    // Respuesta de éxito
    res.json({
      msg: successMessages.phoneVerified,
    });
  } catch (error) {
    // Manejo de errores y respuesta
    res.status(500).json({
      msg: errorMessages.databaseError,
      error,
    });
  }
};
/**
 * Reenvía un código de verificación por SMS al número de teléfono asociado a un usuario.
 * @function
 * @async
 * @param {Request} req - Objeto de solicitud HTTP.
 * @param {Response} res - Objeto de respuesta HTTP.
 * @throws {Error} Si hay un error al interactuar con la base de datos o al enviar el SMS.
 * @returns {Response} - Mensaje de éxito o error.
 */
export const resendVerificationCodeSMS = async (req: Request, res: Response) => {
  // Extraer el nombre de usuario del cuerpo de la solicitud
  const { username } = req.body;

  try {
    // Buscar al usuario en la base de datos
    const user: any = await Auth.findOne({ where: { username: username } });

    // Validar si el usuario no existe
    if (!user) {
      return res.status(400).json({
        msg: errorMessages.userNotExists(username),
      });
    }

    // Validar si el teléfono ya está verificado
    if (user.isPhoneVerified) {
      return res.status(400).json({
        msg: errorMessages.phoneAlreadyVerified,
      });
    }

    // Generar un nuevo código de verificación
    const newVerificationCode = generateVerificationCode();

    // Calcular la fecha de expiración del nuevo código de verificación
    const expirationDate = new Date();
    expirationDate.setMinutes(expirationDate.getMinutes() + PHONE_VERIFICATION_LOCK_TIME_MINUTES);

    // Buscar el registro de verificación correspondiente al usuario
    let verificationRecord = await Verification.findOne({ where: { userId: user.id } });

    // Si no existe, crear un nuevo registro en la tabla 'Verification'
    if (!verificationRecord) {
      verificationRecord = await Verification.create({ userId: user.id });
    }

    // Actualizar el registro de verificación con el nuevo código y la fecha de expiración
    await verificationRecord.update({
      verificationCode: newVerificationCode,
      verificationCodeExpiration: expirationDate,
    });

    // Enviar el nuevo código de verificación por SMS usando Twilio
    const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

    client.messages
      .create({
        body: `Tu nuevo código de verificación por SMS es: ${newVerificationCode}`,
        from: process.env.TWILIO_PHONE_NUMBER,
        to: user.phoneNumber,
      })
      .then((message) => {
        console.log('Nuevo código de verificación enviado por SMS:', message.sid);
        res.json({
          msg: successMessages.verificationCodeSent,
        });
      })
      .catch((error) => {
        console.error('Error al enviar el nuevo código de verificación por SMS:', error);
        res.status(500).json({
          msg: errorMessages.phoneNumberVerificationError,
          error,
        });
      });
  } catch (error) {
    // Manejo de errores y respuesta
    res.status(500).json({
      msg: errorMessages.databaseError,
      error,
    }); 
  }
};

