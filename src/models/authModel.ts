import { DataTypes, Model } from 'sequelize';
import sequelize from '../database/connection';
import { Verification } from './verificationModel';
import { UserProfileModel } from './profileAdminModel';
// Modelo para la autenticación de usuarios
export interface AuthModel extends Model {
  [x: string]: any;

  id: number;
  username: string;
  password: string;
  email: string;
  rol: string;
}

export const Auth = sequelize.define<AuthModel>('auth', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  username: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
  },
  password: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  email: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
  },
  phoneNumber: {
    type: DataTypes.STRING,
    allowNull: true, // Asegúrate de que el campo pueda ser nulo
    unique: true,
  },
  rol: {
    type: DataTypes.STRING,
    allowNull: false,
  },
});
