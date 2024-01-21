"use strict";
// userService.ts
Object.defineProperty(exports, "__esModule", { value: true });
exports.resetLoginAttempts = exports.getUserByUsername = void 0;
const authModel_1 = require("../../models/authModel");
const getUserByUsername = async (username) => {
    return await authModel_1.Auth.findOne({
        where: { username: username },
        include: ['verification'],
    });
};
exports.getUserByUsername = getUserByUsername;
const resetLoginAttempts = async (user) => {
    await user.verification.update({ loginAttempts: 0 });
};
exports.resetLoginAttempts = resetLoginAttempts;
