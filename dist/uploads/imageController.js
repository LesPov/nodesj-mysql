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
exports.uploadProfilePicture = void 0;
const multer_1 = __importDefault(require("multer"));
const path_1 = __importDefault(require("path"));
const promises_1 = __importDefault(require("fs/promises"));
const profileAdminModel_1 = require("../../../models/profileAdminModel");
const authModel_1 = require("../../../models/authModel");
const messages_1 = require("../../../middleware/messages");
const storage = multer_1.default.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads');
    },
    filename: function (req, file, cb) {
        console.log(file);
        cb(null, `${Date.now()}-${file.originalname}`);
    },
});
const upload = (0, multer_1.default)({ storage: storage }).single('profilePicture');
const uploadProfilePicture = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { userId } = req.params;
    try {
        const user = yield authModel_1.Auth.findByPk(userId);
        if (!user) {
            return res.status(404).json({ msg: messages_1.errorMessages.userNotFound });
        }
        upload(req, res, function (err) {
            return __awaiter(this, void 0, void 0, function* () {
                if (err) {
                    console.error('Error al subir la imagen:', err);
                    return res.status(500).json({ msg: messages_1.errorMessages.serverError });
                }
                if (!req.file) {
                    return res.status(400).json({ msg: messages_1.errorMessages.noFileUploaded });
                }
                const imagePath = req.file.path;
                const userProfile = yield profileAdminModel_1.UserProfile.findOne({ where: { userId } });
                if (userProfile) {
                    if (userProfile.profilePicture) {
                        const previousImagePath = path_1.default.resolve('uploads', userProfile.profilePicture);
                        try {
                            yield promises_1.default.access(previousImagePath);
                            yield promises_1.default.unlink(previousImagePath);
                            console.log('Imagen anterior eliminada correctamente');
                        }
                        catch (unlinkError) {
                            console.warn('La imagen anterior no existe o no se pudo eliminar:', messages_1.errorMessages.unexpectedError);
                        }
                    }
                    userProfile.profilePicture = req.file.filename;
                    yield userProfile.save();
                    res.json({ msg: messages_1.successMessages.profilePictureUploaded });
                }
                else {
                    res.status(404).json({ msg: messages_1.errorMessages.userProfileNotFound });
                }
            });
        });
    }
    catch (error) {
        console.error('Error al subir la imagen de perfil:', error);
        res.status(500).json({ msg: messages_1.errorMessages.serverError });
    }
});
exports.uploadProfilePicture = uploadProfilePicture;
exports.default = exports.uploadProfilePicture;
