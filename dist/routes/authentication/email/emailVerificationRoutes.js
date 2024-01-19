"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const emailVerificationController_1 = require("../../../controllers/authentication/email/emailVerificationController");
const emailVerificationRoutes = (0, express_1.Router)();
/**
 * PUT /api/user/verify/email
 * Ruta para verificar el correo electrónico.
 * Público
 */
emailVerificationRoutes.put('/verify/email', emailVerificationController_1.verifyUser);
/**
 * POST /api/user/verify/email/resend
 * Ruta para reenviar el código de verificación por correo electrónico.
 * Público
 */
emailVerificationRoutes.post('/verify/email/resend', emailVerificationController_1.resendVerificationCode);
exports.default = emailVerificationRoutes;
