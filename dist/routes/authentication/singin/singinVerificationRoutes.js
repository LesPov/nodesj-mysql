"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const signinController_1 = require("../../../controllers/authentication/singin/signinController");
const router = (0, express_1.Router)();
// Rutas existentes para registro 
/**
 * POST /api/user/register
 *  Ruta para registrar un nuevo usuario.
 *  Público
 */
router.post('/register', signinController_1.newUser);
exports.default = router;
