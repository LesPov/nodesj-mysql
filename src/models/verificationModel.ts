import { DataTypes, Model } from 'sequelize';
import sequelize from '../database/connection';
import { Auth } from './authModel';


// Modelo para la verificación de usuarios
export interface VerificationModel extends Model {
  id: number;
  isVerified: boolean;
  isEmailVerified: boolean;
  verificationCode: string;
  loginAttempts: number;
  verificationCodeExpiration: Date;
  randomPassword: string;
  isPhoneVerified: boolean;
}

export const Verification = sequelize.define<VerificationModel>('verification', {
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    unique: true,
    references: {
      model: 'auths', // Este debe ser el nombre de la tabla en tu base de datos
      key: 'id', // La columna que se usará como clave primaria
    }
  },
  isVerified: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
  },
  isEmailVerified: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
  },
  verificationCode: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
  },
  loginAttempts: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
  },
  blockExpiration: {
    type: DataTypes.DATE,
  },
  verificationCodeExpiration: {
    type: DataTypes.DATE,
  },
  randomPassword: {
    type: DataTypes.STRING,
  },
  isPhoneVerified: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
  },
});

Auth.hasOne(Verification, { foreignKey: 'userId' });
Verification.belongsTo(Auth, { foreignKey: 'userId' });