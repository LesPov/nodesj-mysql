"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const validateToken_1 = __importDefault(require("../../../middleware/validateToken"));
const validateRole_1 = __importDefault(require("../../../middleware/validateRole"));
const adminProfile_1 = require("../../../controllers/Admin/profile/adminProfile");
const router = express_1.default.Router();
/**
 * GET /api/user/admin
 * Ruta protegida para los administradores.
 * Privado (solo para usuarios con rol 'admin')
 */
router.get('/admin', validateToken_1.default, (0, validateRole_1.default)('admin'), (req, res) => {
    res.send('Bienvenido, eres un administrador');
});
/**
 * GET /api/user/admin/profile/:userId
 * Ruta protegida para obtener el perfil de un usuario por su ID.
 * Privado (solo para usuarios con rol 'admin')
 */
router.get('/profile/:userId', validateToken_1.default, (req, res) => {
    (0, adminProfile_1.getUserProfile)(req, res);
});
router.put('/profile/:userId', validateToken_1.default, (req, res) => {
    (0, adminProfile_1.updateUserProfile)(req, res);
});
exports.default = router;
