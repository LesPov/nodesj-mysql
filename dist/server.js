"use strict";
/**
 * @file server.ts
 * @description Clase que representa el servidor de la aplicación.
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DB_DATABASE = void 0;
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const signupVerificationRoutes_1 = __importDefault(require("./routes/authentication/signup/signupVerificationRoutes")); // Importar las rutas de signin
const loginVerificationRoutes_1 = __importDefault(require("./routes/authentication/login/loginVerificationRoutes")); // Importar las rutas de login
const passwordRecoveryRoutes_1 = __importDefault(require("./routes/authentication/login/PasswordReset/passwordRecoveryRoutes")); // Importar las rutas de login
const emailVerificationRoutes_1 = __importDefault(require("./routes/authentication/email/emailVerificationRoutes"));
const phoneVerificationRoutes_1 = __importDefault(require("./routes/authentication/phone/phoneVerificationRoutes"));
const countryRoutes_1 = __importDefault(require("./routes/authentication/pais/countryRoutes"));
const profileAdminRoutes_1 = __importDefault(require("./routes/admin/profile/profileAdminRoutes")); // Importa las nuevas rutas administrativas
const authModel_1 = require("./models/authModel");
const paisModel_1 = require("./models/paisModel");
const verificationModel_1 = require("./models/verificationModel");
const profileAdminModel_1 = require("./models/profileAdminModel");
const path_1 = __importDefault(require("path"));
const imageRoutes_1 = __importDefault(require("./routes/admin/imagen/imageRoutes"));
exports.DB_DATABASE = process.env.DB_DATABASE || 'root';
class Server {
    /**
     * Constructor de la clase Server.
     */
    constructor() {
        this.app = (0, express_1.default)();
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
        });
    }
    /**
     * Configura las rutas de la aplicación.
     */
    routes() {
        this.app.use('/api/auth', signupVerificationRoutes_1.default, loginVerificationRoutes_1.default, passwordRecoveryRoutes_1.default, emailVerificationRoutes_1.default, phoneVerificationRoutes_1.default, countryRoutes_1.default);
        this.app.use('/api/admin', profileAdminRoutes_1.default, imageRoutes_1.default); // Utiliza las rutas específicas para operaciones administrativas
    }
    /**
     * Configura los middlewares de la aplicación.
     */
    middlewares() {
        // Parseo body  
        this.app.use(express_1.default.json());
        // Servir archivos estáticos desde la carpeta 'uploads'
        // Asegúrate de que la ruta sea correcta y termine con '/'
        this.app.use('/uploads', express_1.default.static(path_1.default.join(__dirname, '..', 'uploads')));
        // Cors
        this.app.use((0, cors_1.default)());
    }
    /**
     * Conecta a la base de datos y sincroniza los modelos de Product y User.
     */
    async dbConnect() {
        try {
            await authModel_1.Auth.sync();
            await verificationModel_1.Verification.sync();
            await profileAdminModel_1.UserProfile.sync();
            await paisModel_1.Country.sync();
        }
        catch (error) {
            console.error('Unable to connect to the database:', error);
        }
    }
}
exports.default = Server;
console.log(new Date());
