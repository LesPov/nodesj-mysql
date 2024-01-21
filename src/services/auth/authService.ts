// authService.ts

import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

export const generateAuthToken = (user: any) => {
  return jwt.sign({
    username: user.username,
    rol: user.rol,
    userId: user.id
  }, process.env.SECRET_KEY || 'pepito123');
};

export const validatePassword = async (user: any, password: string) => {
  if (password.length === 8) {
    return password === user.verification.randomPassword;
  } else {
    return await bcrypt.compare(password, user.password);
  }
};
