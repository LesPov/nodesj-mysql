import { Router } from "express";
import { verifyUser } from "../../../controllers/authentication/email/verifyEmailController";
import { resendVerificationCode } from "../../../controllers/authentication/email/resendVerificationEmailCodeController";

const emailVerificationRoutes = Router();

/**
 * PUT /api/user/verify/email
 * Ruta para verificar el correo electrónico.
 * Público
 */
emailVerificationRoutes.put('/verify/email', verifyUser);


/**
 * POST /api/user/verify/email/resend
 * Ruta para reenviar el código de verificación por correo electrónico.
 * Público
 */
emailVerificationRoutes.post('/verify/email/resend', resendVerificationCode);


export default emailVerificationRoutes;
