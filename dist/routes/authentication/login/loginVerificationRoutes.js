"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const loginController_1 = require("../../../controllers/authentication/login/loginController");
const validateRole_1 = __importDefault(require("../../../middleware/validateRole"));
const validateToken_1 = __importDefault(require("../../../middleware/validateToken"));
const router = (0, express_1.Router)();
/**
 * POST /api/user/login
 *  Ruta para que los usuarios inicien sesión.
 *  Público
 */
router.post('/login', loginController_1.loginUser);
/**
 *  GET /api/user/user
 *  Ruta protegida para los usuarios normales.
 *  Privado (solo para usuarios con rol 'user')
 */
router.get('/user', validateToken_1.default, (0, validateRole_1.default)('user'), (req, res) => {
    res.send('Bienvenido, eres un usuario normal');
});
exports.default = router;
