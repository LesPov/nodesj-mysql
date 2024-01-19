/**
 * @file index.ts
 * @description Archivo principal para configurar y arrancar el servidor de la aplicación.
 */
import Server from "./server";
import dontenv from 'dotenv';
// Configurar las variables de entorno del archivo .env
dontenv.config();

// Crear una instancia del servidor
const server = new Server();

 