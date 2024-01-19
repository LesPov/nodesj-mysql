"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * @file index.ts
 * @description Archivo principal para configurar y arrancar el servidor de la aplicación.
 */
const server_1 = __importDefault(require("./server"));
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
// Crear una instancia del servidor
const server = new server_1.default();
