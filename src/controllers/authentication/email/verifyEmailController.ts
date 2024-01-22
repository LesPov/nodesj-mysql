// emailVerificationController.ts
import { Request, Response } from 'express';
import { Auth } from '../../../models/authModel';
import { errorMessages, successMessages } from '../../../middleware/messages';
import { Verification } from '../../../models/verificationModel';



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
