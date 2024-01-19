import { DataTypes } from 'sequelize';
import sequelize from '../database/connection';

export const Country = sequelize.define('pais', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  countryCode: {
    type: DataTypes.STRING, 
    allowNull: false,
    unique: true,
  }, 
  flagImage: {
    type: DataTypes.STRING,
    allowNull: false,
  },
});
