// validateRole.ts
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { errorMessages } from './messages';

const validateRole = (requiredRole: string) => {
  return (req: Request, res: Response, next: NextFunction) => {
    // Verifica el token del usuario para obtener el rol
    const token = req.headers['authorization']?.split(' ')[1];
    if (!token) {
      return res.status(401).json({
        msg: errorMessages.tokenNotProvided,
      });
    }

    try {
      const decodedToken: any = jwt.verify(token, process.env.SECRET_KEY || 'pepito123');
      const userRole = decodedToken.rol;

      // Verificar si el rol del usuario coincide con el rol requerido o es un administrador
      if (userRole === requiredRole || userRole === 'admin') {
        // Si el rol es válido, se permite el acceso a la ruta protegida
        next();
      } else {
        return res.status(403).json({
          msg: errorMessages.accessDenied,
        });
      }
    } catch (error) {
      return res.status(401).json({
        msg: errorMessages.invalidToken,
      });
    }
  };
};

export default validateRole;
