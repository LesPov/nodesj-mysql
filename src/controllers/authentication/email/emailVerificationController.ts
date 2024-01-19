// emailVerificationController.ts
import { Request, Response } from 'express';
import { Auth } from '../../../models/authModel';
import fs from 'fs';
import path from 'path';
import nodemailer from 'nodemailer';
import { errorMessages, successMessages } from '../../../middleware/messages';
import { Verification } from '../../../models/verificationModel';

const VERIFICATION_CODE_EXPIRATION_HOURS = 24;

////////////////////////////////////////////////////////////////////////////////////////////////////

/**
 * Envía un correo de verificación con un código personalizado.
 * @param {string} email - Dirección de correo electrónico del destinatario.
 * @param {string} username - Nombre de usuario asociado al correo.
 * @param {string} verificationCode - Código de verificación generado.
 * @returns {boolean} - True si el correo se envía con éxito, False si hay un error.
 */
export const sendVerificationEmail = async (email: string, username: string, verificationCode: string) => {
  try {
    // Obtiene la ruta absoluta del archivo de plantilla de correo electrónico
    const templatePath = path.join(__dirname, '../..', 'templates', 'verificationEmail.html');

    // Lee la plantilla de correo electrónico desde el archivo
    const emailTemplate = fs.readFileSync(templatePath, 'utf-8');

    // Reemplaza los marcadores {{ username }} y {{ verificationCode }} con los valores reales
    const personalizedEmail = emailTemplate.replace('{{ username }}', username).replace('{{ verificationCode }}', verificationCode);

    // Crea un transporte de nodemailer para reutilizarlo
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.MAIL_USER,
        pass: process.env.MAIL_PASS,
      },
      secure: true,
    });

    // Registra en la consola el código de verificación enviado
    console.log('Código de verificación enviado:', verificationCode);

    const mailOptions = {
      from: process.env.MAIL_USER,
      to: email,
      subject: 'Verificación de correo electrónico',
      html: personalizedEmail, // Utiliza el contenido personalizado en el cuerpo del correo
    };

    // Envía el correo de verificación
    await transporter.sendMail(mailOptions);

    return true; // Indica que el correo de verificación se envió con éxito
  } catch (error) {
    console.error('Error al enviar el correo de verificación:', error);
    return false; // Indica que hubo un error al enviar el correo de verificación
  }
};

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
  
 /**
 * @function verifyUser
 * @description Verifica la autenticación del usuario mediante el código de verificación.
 * @param {Request} req - El objeto de solicitud de Express.
 * @param {Response} res - El objeto de respuesta de Express.
 * @returns {Promise<void>} Una promesa que resuelve cuando se completa la verificación.
 */
export const verifyUser = async (req: Request, res: Response) => {
  // Extraer el nombre de usuario y el código de verificación del cuerpo de la solicitud.
  const { username, verificationCode } = req.body;

  try {
      // Buscar el usuario en la base de datos utilizando el nombre de usuario.
      const user: any = await Auth.findOne({ where: { username: username }, include: [Verification] });

      // Si no se encuentra el usuario, responder con un mensaje de error.
      if (!user) {
          return res.status(400).json({
              msg: errorMessages.userNotExists(username),
          });
      }

      // Si el correo electrónico ya está verificado, responder con un mensaje de error.
      if (user.isEmailVerified) {
          return res.status(400).json({
              msg: errorMessages.userAlreadyVerified,
          });
      }

      // Obtener la fecha actual.
      const currentDate = new Date();

      // Si el código de verificación ha expirado, responder con un mensaje de error.
      if (user.verificationCodeExpiration && user.verificationCodeExpiration < currentDate) {
          return res.status(400).json({
              msg: errorMessages.verificationCodeExpired,
          });
      }

      // Comparar el código de verificación proporcionado con el almacenado en la base de datos.
      if (user.verification.verificationCode !== verificationCode.trim()) {
          return res.status(400).json({
              msg: errorMessages.invalidVerificationCode,
          });
      }
     
    // Marcar el correo electrónico como verificado en la tabla Verification.
    await Verification.update(
      { isEmailVerified: true }, 
      { where: { userId: user.id } }
    ); 

    if (user.isPhoneVerified) {
      // Marcar el usuario como verificado en la tabla Verification si el teléfono también está verificado.
      await Verification.update(
        { isVerified: true },
        { where: { userId: user.id } }
      );
    }
      // Responder con un mensaje de éxito.
      res.json({
          msg: successMessages.userVerified,
      });
  } catch (error) {
      // Si ocurre un error en la base de datos, responder con un mensaje de error y detalles del error.
      res.status(500).json({
          msg: errorMessages.databaseError,
          error,
      });
  }
};

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
