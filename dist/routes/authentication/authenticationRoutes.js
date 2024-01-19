"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const authenticationController_1 = require("../../controllers/authentication/authenticationController");
const validateRole_1 = __importDefault(require("../../middleware/validateRole"));
const validateToken_1 = __importDefault(require("../../middleware/validateToken"));
const router = (0, express_1.Router)();
// Rutas existentes para registro y login (código anterior)
/**
 * POST /api/user/register
 *  Ruta para registrar un nuevo usuario.
 *  Público
 */
router.post('/register', authenticationController_1.newUser);
/**
 * POST /api/user/login
 *  Ruta para que los usuarios inicien sesión.
 *  Público
 */
router.post('/login', authenticationController_1.loginUser);
// ... otras importaciones ...
/**
 * POST /api/user/forgot-password
 * Ruta para solicitar un correo electrónico de recuperación de contraseña.
 * Público
 */
router.post('/forgot-password', authenticationController_1.requestPasswordReset);
/**
 * POST /api/user/reset-password
 * Ruta para cambiar la contraseña después de recibir el correo de recuperación.
 * Público
 */
router.post('/reset-password', authenticationController_1.resetPassword);
// ... otras rutas ...
/**
 *  GET /api/user/admin
 *  Ruta protegida para los administradores.
 *  Privado (solo para usuarios con rol 'admin')
 */
router.get('/admin', validateToken_1.default, (0, validateRole_1.default)('admin'), (req, res) => {
    res.send('Bienvenido, eres un administrador');
});
/**
 *  GET /api/user/user
 *  Ruta protegida para los usuarios normales.
 *  Privado (solo para usuarios con rol 'user')
 */
router.get('/user', validateToken_1.default, (0, validateRole_1.default)('user'), (req, res) => {
    res.send('Bienvenido, eres un usuario normal');
});
exports.default = router;
