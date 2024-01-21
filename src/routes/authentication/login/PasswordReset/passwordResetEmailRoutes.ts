
import { Router } from "express";
import validateToken from "../../../../middleware/validateToken";
import { resetPassword } from "../../../../controllers/authentication/login/passwordReset/passwordResetEmailController";

const router = Router();

/**
 * POST /api/user/reset-password
 * Ruta para cambiar la contraseña después de recibir el correo de recuperación.
 * Público
 */
router.post('/reset-password', validateToken, resetPassword);

export default router;
