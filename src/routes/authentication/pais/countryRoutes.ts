// routes/authentication/countryRoutes.ts

import express from 'express';
import { getAllCountryCodes } from '../../../controllers/authentication/pais/countryController';

const router = express.Router();

// Ruta para obtener todos los códigos de país
router.get('/countries', getAllCountryCodes);

export default router;
