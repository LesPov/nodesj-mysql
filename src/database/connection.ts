import { Sequelize } from "sequelize";
import * as config from '../config'; // Importa tu archivo de configuración

const sequelize = new Sequelize(
    config.DB_DATABASE,
    config.DB_USER,
    config.DB_PASSWORD,
    {
        host: config.DB_HOST,
        dialect: 'mysql',
        port: parseInt(config.DB_PORT, 10), // Asegúrate de convertirlo a número
    }
);

export default sequelize;
