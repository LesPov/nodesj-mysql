"use strict";
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
const allowedImageExtensions = ['.jpg', '.jpeg', '.png', '.gif'];
const isImage = (filename) => {
    const ext = path_1.default.extname(filename).toLowerCase();
    return allowedImageExtensions.includes(ext);
};
const uploadProfilePicture = async (req, res) => {
    const { userId } = req.params;
    try {
        const user = await authModel_1.Auth.findByPk(userId);
        if (!user) {
            return res.status(404).json({ msg: messages_1.errorMessages.userNotFound });
        }
        return new Promise((resolve) => {
            upload(req, res, async function (err) {
                if (err) {
                    console.error('Error al subir la imagen:', err);
                    return resolve(res.status(500).json({ msg: messages_1.errorMessages.serverError }));
                }
                if (!req.file) {
                    return resolve(res.status(400).json({ msg: messages_1.errorMessages.noFileUploaded }));
                }
                if (!isImage(req.file.filename)) {
                    await promises_1.default.unlink(req.file.path);
                    return resolve(res.status(400).json({ msg: messages_1.errorMessages.invalidImageFormat }));
                }
                const imagePath = req.file.path;
                const userProfile = await profileAdminModel_1.UserProfile.findOne({ where: { userId } });
                if (userProfile) {
                    if (userProfile.profilePicture) {
                        const previousImagePath = path_1.default.resolve('uploads', userProfile.profilePicture);
                        try {
                            await promises_1.default.access(previousImagePath);
                            await promises_1.default.unlink(previousImagePath);
                            console.log('Imagen anterior eliminada correctamente');
                        }
                        catch (unlinkError) {
                            console.warn('La imagen anterior no existe o no se pudo eliminar:', messages_1.errorMessages.unexpectedError);
                        }
                    }
                    userProfile.profilePicture = req.file.filename;
                    await userProfile.save();
                    return resolve(res.json({ msg: messages_1.successMessages.profilePictureUploaded }));
                }
                else {
                    return resolve(res.status(404).json({ msg: messages_1.errorMessages.userProfileNotFound }));
                }
            });
        });
    }
    catch (error) {
        console.error('Error al subir la imagen de perfil:', error);
        return res.status(500).json({ msg: messages_1.errorMessages.serverError });
    }
};
exports.uploadProfilePicture = uploadProfilePicture;
exports.default = exports.uploadProfilePicture;
