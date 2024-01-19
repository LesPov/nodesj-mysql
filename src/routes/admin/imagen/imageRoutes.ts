import express from 'express';
import validateToken from '../../../middleware/validateToken';
import { uploadProfilePicture } from '../../../controllers/Admin/imagenes/imageController';

const router = express.Router();

// Ruta para subir la imagen de perfil
router.post('/profile/:userId/upload-picture', validateToken, (req, res) => {
  uploadProfilePicture(req, res);
});

export default router;
