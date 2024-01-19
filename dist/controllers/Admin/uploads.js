"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.uploadFiles = exports.upload = void 0;
const multer_1 = __importDefault(require("multer"));
const profileAdminModel_1 = require("../../models/profileAdminModel");
const storage = multer_1.default.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads');
    },
    filename: function (req, file, cb) {
        console.log(file);
        cb(null, `${Date.now()}-${file.originalname}`);
    }
});
const uploads = (0, multer_1.default)({ storage: storage });
exports.upload = uploads.single('myFile');
const uploadFiles = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        if (!req.file) {
            return res.status(400).send('No se ha seleccionado ningún archivo');
        }
        // Obtener el nombre de archivo y la ubicación del archivo cargado
        const fileName = req.file.filename;
        // Obtener el ID del usuario al que se le actualizará la imagen de perfil
        const userId = req.body.userId;
        // Actualizar la imagen de perfil del usuario en la base de datos
        const user = yield profileAdminModel_1.UserProfile.findOne({ where: { userId: userId } });
        if (!user) {
            return res.status(404).json({ msg: 'Perfil de usuario no encontrado' });
        }
        user.profilePicture = fileName; // Asignar el nombre del archivo a la columna userpicture
        yield user.save();
        res.status(200).json({ msg: 'Imagen de perfil actualizada correctamente' });
    }
    catch (error) {
        console.error('Error al procesar la carga de archivos:', error);
        res.status(500).json({ msg: 'Error al procesar la solicitud', error });
    }
});
exports.uploadFiles = uploadFiles;
