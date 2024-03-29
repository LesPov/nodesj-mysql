
import { Router } from "express";
import {  newUser } from "../../../controllers/authentication/signup/signupController";

const router = Router();
// Rutas existentes para registro 
/**
 * POST /api/user/register
 *  Ruta para registrar un nuevo usuario.
 *  Público
 */
router.post('/register', newUser);
export default router;
