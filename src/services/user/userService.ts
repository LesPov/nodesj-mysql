// userService.ts

import { Auth } from '../../models/authModel';

export const getUserByUsername = async (username: string) => {
  return await Auth.findOne({
    where: { username: username },
    include: ['verification'],
  });
};

export const resetLoginAttempts = async (user: any) => {
  await user.verification.update({ loginAttempts: 0 });
};
