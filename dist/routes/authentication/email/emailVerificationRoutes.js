"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const verifyEmailController_1 = require("../../../controllers/authentication/email/verifyEmailController");
const resendVerificationEmailCodeController_1 = require("../../../controllers/authentication/email/resendVerificationEmailCodeController");
const emailVerificationRoutes = (0, express_1.Router)();
/**
 * PUT /api/user/verify/email
 * Ruta para verificar el correo electrónico.
 * Público
 */
emailVerificationRoutes.put('/verify/email', verifyEmailController_1.verifyUser);
/**
 * POST /api/user/verify/email/resend
 * Ruta para reenviar el código de verificación por correo electrónico.
 * Público
 */
emailVerificationRoutes.post('/verify/email/resend', resendVerificationEmailCodeController_1.resendVerificationCode);
exports.default = emailVerificationRoutes;
