"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const phoneVerificationController_1 = require("../../../controllers/authentication/phone/phoneVerificationController");
const phoneVerificationRouter = (0, express_1.Router)();
/**
 * POST /api/user/verify/send
 * Ruta para enviar el código de verificación por SMS.
 * Público
 */
phoneVerificationRouter.post("/verify/send", phoneVerificationController_1.sendVerificationCode);
/**
 * POST /api/user/verify/resend
 * Ruta para reenviar el código de verificación por SMS.
 * Público
 */
phoneVerificationRouter.post("/verify/resend", phoneVerificationController_1.resendVerificationCodeSMS);
/**
 * PUT /api/user/verify/phone
 * Ruta para verificar el número de teléfono.
 * Público
 */
phoneVerificationRouter.put('/verify/phone', phoneVerificationController_1.verifyPhoneNumber);
exports.default = phoneVerificationRouter;
