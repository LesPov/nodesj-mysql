"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const validateToken_1 = __importDefault(require("../../../../middleware/validateToken"));
const passwordResetEmailController_1 = require("../../../../controllers/authentication/login/passwordReset/passwordResetEmailController");
const router = (0, express_1.Router)();
/**
 * POST /api/user/reset-password
 * Ruta para cambiar la contraseña después de recibir el correo de recuperación.
 * Público
 */
router.post('/reset-password', validateToken_1.default, passwordResetEmailController_1.resetPassword);
exports.default = router;
