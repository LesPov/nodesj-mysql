/**
 * @file server.ts
 * @description Clase que representa el servidor de la aplicación.
 */

import express, { Application } from 'express';
import cors from 'cors';
import signinRoutes from "./routes/authentication/signup/signupVerificationRoutes"; // Importar las rutas de signin
import loginRoutes from "./routes/authentication/login/loginVerificationRoutes"; // Importar las rutas de login
import randomPass from "./routes/authentication/login/PasswordReset/passwordResetEmailRoutes"; // Importar las rutas de login
import passwordResetRouter from "./routes/authentication/login/PasswordReset/passwordRecoveryRoutes"; // Importar las rutas de login

import emailVerificationRoutes from './routes/authentication/email/emailVerificationRoutes';
import phoneVerificationRouter from './routes/authentication/phone/phoneVerificationRoutes';
import countryRoutes from './routes/authentication/pais/countryRoutes';
import adminRoutes from './routes/admin/profile/profileAdminRoutes'; // Importa las nuevas rutas administrativas

import { Auth } from './models/authModel';
import { Country } from './models/paisModel';
import { Verification } from './models/verificationModel';
import { UserProfile } from './models/profileAdminModel';
import path from 'path';
import imageRoutes from './routes/admin/imagen/imageRoutes';

export const DB_DATABASE = process.env.DB_DATABASE || 'root'


class Server {

    private app: Application;
    private port: string;

    /**
     * Constructor de la clase Server.
     */
    constructor() {
        this.app = express();
        this.port = process.env.PORT || '3010';
        this.listen();
        this.middlewares();
        this.routes();
        this.dbConnect();
    }

    /**
     * Inicia el servidor y escucha en el puerto especificado.
     */
    listen() {
        this.app.listen(this.port, () => {
            console.log('Aplicacion corriendo en el puerto ' + this.port);
        })
    }

    /**
     * Configura las rutas de la aplicación.
     */
    routes() {
        this.app.use('/api/auth', signinRoutes, loginRoutes, randomPass, passwordResetRouter, emailVerificationRoutes, phoneVerificationRouter, countryRoutes);
        this.app.use('/api/admin', adminRoutes, imageRoutes); // Utiliza las rutas específicas para operaciones administrativas


    }

    /**
     * Configura los middlewares de la aplicación. 
     */
    middlewares() {
        // Parseo body  
        this.app.use(express.json());
        // Servir archivos estáticos desde la carpeta 'uploads'
        // Asegúrate de que la ruta sea correcta y termine con '/'
        this.app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

        // Cors
        this.app.use(cors());
    }

    /**
     * Conecta a la base de datos y sincroniza los modelos de Product y User.
     */
    async dbConnect() {
        try {
            await Auth.sync();
            await Verification.sync();
            await UserProfile.sync();
            await Country.sync();
        } catch (error) {
            console.error('Unable to connect to the database:', error);
        }
    }
}


export default Server;
console.log(new Date());


