/**
 * @file index.ts
 * @description Archivo principal para configurar y arrancar el servidor de la aplicación.
 */
import Server from "./server";
import dotenv from 'dotenv';
dotenv.config();


// Crear una instancia del servidor
const server = new Server();

 