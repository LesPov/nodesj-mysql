"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const validateToken_1 = __importDefault(require("../../../middleware/validateToken"));
const imageController_1 = require("../../../controllers/Admin/imagenes/imageController");
const router = express_1.default.Router();
// Ruta para subir la imagen de perfil
router.post('/profile/:userId/upload-picture', validateToken_1.default, (req, res) => {
    (0, imageController_1.uploadProfilePicture)(req, res);
});
exports.default = router;
