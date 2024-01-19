import { DataTypes, Model } from 'sequelize';
import sequelize from '../database/connection';
import { Auth, AuthModel } from './authModel';

// Modelo para el perfil de usuario
export interface UserProfileModel extends Model {
  auth: AuthModel;
  id: number;
  userId: number;
  profilePicture: string | null;
  firstName: string;
  lastName: string;
  biography: string | null;
  direccion: string | null;
  profileType: boolean;
  messageType: boolean;
  status: 'Activado' | 'Desactivado'; // Nueva columna 'status'v 

}

export const UserProfile = sequelize.define<UserProfileModel>('userProfile', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    unique: true,
    references: {
      model: Auth,
      key: 'id',
    },
  },
  profilePicture: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  firstName: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  lastName: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  biography: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  direccion: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  profileType: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
  },
  messageType: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
  },
  status: {
    type: DataTypes.ENUM('Activado', 'Desactivado'), // Define un enum para limitar los valores posibles
    allowNull: false,
    defaultValue: 'Activado', // Puedes establecer el valor predeterminado según tus necesidades
  },
});

// Relación entre Auth (usuario) y UserProfile (perfil de usuario)
Auth.hasOne(UserProfile, { foreignKey: 'userId' });
UserProfile.belongsTo(Auth, { foreignKey: 'userId' });
