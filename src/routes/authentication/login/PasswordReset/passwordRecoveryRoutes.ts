import { Router } from "express";
import { requestPasswordReset } from "../../../../controllers/authentication/login/passwordReset/passwordRecoveryController";

const router = Router();

/**
 * POST /api/user/forgot-password
 * Ruta para solicitar un correo electrónico de recuperación de contraseña.
 * Público
 */
router.post('/forgot-password', requestPasswordReset);

export default router;
