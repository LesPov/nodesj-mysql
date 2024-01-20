"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const signupController_1 = require("../../../controllers/authentication/signup/signupController");
const router = (0, express_1.Router)();
// Rutas existentes para registro 
/**
 * POST /api/user/register
 *  Ruta para registrar un nuevo usuario.
 *  Público
 */
router.post('/register', signupController_1.newUser);
exports.default = router;
