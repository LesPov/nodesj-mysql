import express from 'express';
import validateToken from '../../../middleware/validateToken';
import validateRole from '../../../middleware/validateRole';
import { getUserProfile, updateUserProfile } from '../../../controllers/Admin/profile/adminProfile';

const router = express.Router();

/**
 * GET /api/user/admin
 * Ruta protegida para los administradores.
 * Privado (solo para usuarios con rol 'admin')    
 */
router.get('/admin', validateToken, validateRole('admin'), (req, res) => {
  res.send('Bienvenido, eres un administrador');
});

/**  
 * GET /api/user/admin/profile/:userId
 * Ruta protegida para obtener el perfil de un usuario por su ID.
 * Privado (solo para usuarios con rol 'admin')
 */
router.get('/profile/:userId', validateToken, (req, res) => {
  getUserProfile(req, res);
});

router.put('/profile/:userId', validateToken, (req, res) => {
  updateUserProfile(req, res);
});

export default router;
