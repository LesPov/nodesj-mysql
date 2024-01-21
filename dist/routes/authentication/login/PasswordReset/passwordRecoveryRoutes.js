"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const passwordRecoveryController_1 = require("../../../../controllers/authentication/login/passwordReset/passwordRecoveryController");
const router = (0, express_1.Router)();
/**
 * POST /api/user/forgot-password
 * Ruta para solicitar un correo electrónico de recuperación de contraseña.
 * Público
 */
router.post('/forgot-password', passwordRecoveryController_1.requestPasswordReset);
exports.default = router;
