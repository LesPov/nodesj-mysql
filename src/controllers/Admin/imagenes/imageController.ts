import { Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs/promises';
import { UserProfile } from '../../../models/profileAdminModel';
import { Auth } from '../../../models/authModel';
import { errorMessages, successMessages } from '../../../middleware/messages';

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads');
  },
  filename: function (req, file, cb) {
    console.log(file);
    cb(null, `${Date.now()}-${file.originalname}`);
  },
});

const upload = multer({ storage: storage }).single('profilePicture');

const allowedImageExtensions = ['.jpg', '.jpeg', '.png', '.gif'];

const isImage = (filename: string): boolean => {
  const ext = path.extname(filename).toLowerCase();
  return allowedImageExtensions.includes(ext);
};

export const uploadProfilePicture = async (req: Request, res: Response): Promise<Response> => {
  const { userId } = req.params;

  try {
    const user = await Auth.findByPk(userId);

    if (!user) {
      return res.status(404).json({ msg: errorMessages.userNotFound });
    }

    return new Promise((resolve) => {
      upload(req, res, async function (err) {
        if (err) {
          console.error('Error al subir la imagen:', err);
          return resolve(res.status(500).json({ msg: errorMessages.serverError }));
        }

        if (!req.file) {
          return resolve(res.status(400).json({ msg: errorMessages.noFileUploaded }));
        }

        if (!isImage(req.file.filename)) {
          await fs.unlink(req.file.path);
          return resolve(res.status(400).json({ msg: errorMessages.invalidImageFormat }));
        }

        const imagePath = req.file.path;

        const userProfile = await UserProfile.findOne({ where: { userId } });

        if (userProfile) {
          if (userProfile.profilePicture) {
            const previousImagePath = path.resolve('uploads', userProfile.profilePicture);
            try {
              await fs.access(previousImagePath);
              await fs.unlink(previousImagePath);
              console.log('Imagen anterior eliminada correctamente');
            } catch (unlinkError) {
              console.warn('La imagen anterior no existe o no se pudo eliminar:', errorMessages.unexpectedError);
            }
          }

          userProfile.profilePicture = req.file.filename;
          await userProfile.save();

          return resolve(res.json({ msg: successMessages.profilePictureUploaded }));
        } else {
          return resolve(res.status(404).json({ msg: errorMessages.userProfileNotFound }));
        }
      });
    });
  } catch (error) {
    console.error('Error al subir la imagen de perfil:', error);
    return res.status(500).json({ msg: errorMessages.serverError });
  }
};
export default uploadProfilePicture;
