"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const messages_1 = require("./messages");
const validateToken = (req, res, next) => {
    const headerToken = req.headers['authorization'];
    // Verificar si el token existe y comienza con 'Bearer '
    if (headerToken != undefined && headerToken.startsWith('Bearer ')) {
        try {
            // Extraer el token del encabezado
            const bearerToken = headerToken.slice(7);
            // Verificar la autenticidad del token
            const decodedToken = jsonwebtoken_1.default.verify(bearerToken, process.env.SECRET_KEY || 'pepito123');
            // Adjuntar la información del usuario al objeto Request
            req.user = decodedToken;
            // Si el token es válido, pasar al siguiente middleware o ruta
            next();
        }
        catch (error) {
            // Si hay un error en la verificación, responder con un error 401 (no autorizado)
            res.status(401).json({
                msg: messages_1.errorMessages.invalidToken,
            });
        }
    }
    else {
        // Si el token no está presente o no comienza con 'Bearer ', responder con un error 401 (no autorizado)
        res.status(401).json({
            msg: messages_1.errorMessages.accessDeniedNoToken,
        });
    }
};
exports.default = validateToken;
