import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { errorMessages } from './messages';

interface CustomRequest extends Request {
    user?: {
        userId: number;
        rol: string;
        // Agrega otras propiedades según sea necesario
    };
}

const validateToken = (req: CustomRequest, res: Response, next: NextFunction) => {
    const headerToken = req.headers['authorization'];

    // Verificar si el token existe y comienza con 'Bearer '
    if (headerToken != undefined && headerToken.startsWith('Bearer ')) {
        try {
            // Extraer el token del encabezado
            const bearerToken = headerToken.slice(7);
            // Verificar la autenticidad del token
            const decodedToken: any = jwt.verify(bearerToken, process.env.SECRET_KEY || 'pepito123');
            // Adjuntar la información del usuario al objeto Request
            req.user = decodedToken;
            // Si el token es válido, pasar al siguiente middleware o ruta
            next();
        } catch (error) {
            // Si hay un error en la verificación, responder con un error 401 (no autorizado)
            res.status(401).json({
                msg: errorMessages.invalidToken,
            });
        }
    } else { 
        // Si el token no está presente o no comienza con 'Bearer ', responder con un error 401 (no autorizado)
        res.status(401).json({
            msg: errorMessages.accessDeniedNoToken,
        });
    }
};

export default validateToken;
