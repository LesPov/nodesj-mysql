"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const uploads_1 = require("../../controllers/Admin/uploads");
const router = express_1.default.Router();
router.post('/', uploads_1.upload, uploads_1.uploadFiles); // Configura la ruta para manejar la subida de archivos
exports.default = router;
