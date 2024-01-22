// resendVerificationCode.ts
import { Request, Response } from 'express';
import { Auth } from '../../../models/authModel';
import { errorMessages, successMessages } from '../../../middleware/messages';
import { Verification } from '../../../models/verificationModel';
import { sendVerificationEmail } from '../../../utils/emailUtils';


const VERIFICATION_CODE_EXPIRATION_HOURS = 24;

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
/**
 * Controlador para volver a enviar el código de verificación por correo electrónico.
 * @param {Request} req - Objeto de solicitud de Express.
 * @param {Response} res - Objeto de respuesta de Express.
 * @returns {Response} - Respuesta JSON con un mensaje indicando el estado de la operación.
 */
export const resendVerificationCode = async (req: Request, res: Response) => {
    // Extraer el nombre de usuario del cuerpo de la solicitud
    const { username } = req.body;
  
    try {
      // Buscar el usuario en la base de datos, incluyendo su información de verificación
      const user: any = await Auth.findOne({ where: { username: username }, include: [Verification] });
  
      // Si el usuario no existe, responder con un mensaje de error
      if (!user) {
        return res.status(400).json({
          msg: errorMessages.userNotExists(username),
        });
      }
  
      // Si el usuario ya está verificado por correo electrónico, responder con un mensaje de error
      if (user.verification.isEmailVerified) {
        return res.status(400).json({
          msg: errorMessages.userAlreadyVerified,
        });
      }
  
      // Generar un nuevo código de verificación
      const newVerificationCode = Math.floor(100000 + Math.random() * 900000).toString();
  
      // Calcular la fecha de expiración del nuevo código
      const expirationDate = new Date();
      expirationDate.setHours(expirationDate.getHours() + VERIFICATION_CODE_EXPIRATION_HOURS);
  
      // Verificar si ya existe un registro de verificación para el usuario
      let verificationRecord = await Verification.findOne({ where: { userId: user.id } });
  
      // Si no existe, crear uno
      if (!verificationRecord) {
        verificationRecord = await Verification.create({
          userId: user.id,
        });
      }
  
      // Actualizar el código de verificación en la tabla 'Verification'
      await verificationRecord.update({
        verificationCode: newVerificationCode,
        verificationCodeExpiration: expirationDate,
      });
  
      // Enviar el correo de verificación
      const emailSent = await sendVerificationEmail(user.email, user.username, newVerificationCode);
  
      // Si el correo se envía con éxito, responder con un mensaje de éxito
      if (emailSent) {
        res.json({
          msg: successMessages.verificationCodeResent,
        });
      } else {
        // Si hay un error al enviar el correo, responder con un mensaje de error
        res.status(500).json({
          msg: errorMessages.emailVerificationError,
        });
      }
    } catch (error) {
      // Si hay un error en la base de datos, responder con un mensaje de error y detalles del error
      res.status(500).json({
        msg: errorMessages.databaseError,
        error,
      });
    }
  };
  