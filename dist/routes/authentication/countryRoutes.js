"use strict";
// routes/authentication/countryRoutes.ts
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const countryController_1 = require("../../controllers/authentication/pais/countryController");
const router = express_1.default.Router();
// Ruta para obtener todos los códigos de país
router.get('/countries', countryController_1.getAllCountryCodes);
exports.default = router;
