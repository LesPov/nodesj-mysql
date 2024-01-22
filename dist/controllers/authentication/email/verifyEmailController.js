"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyUser = void 0;
const authModel_1 = require("../../../models/authModel");
const messages_1 = require("../../../middleware/messages");
const verificationModel_1 = require("../../../models/verificationModel");
const findUserByUsername = async (username) => {
    return authModel_1.Auth.findOne({ where: { username: username }, include: [verificationModel_1.Verification] });
};
const isUserAlreadyVerified = (user) => {
    return user.isEmailVerified;
};
const isVerificationCodeExpired = (user, currentDate) => {
    return user.verificationCodeExpiration && user.verificationCodeExpiration < currentDate;
};
const isInvalidVerificationCode = (user, verificationCode) => {
    return user.verification.verificationCode !== verificationCode.trim();
};
const markEmailAsVerified = async (userId) => {
    await verificationModel_1.Verification.update({ isEmailVerified: true }, { where: { userId } });
};
const markUserAsVerified = async (userId) => {
    await verificationModel_1.Verification.update({ isVerified: true }, { where: { userId } });
};
const checkUserVerificationStatus = (user) => {
    if (isUserAlreadyVerified(user)) {
        throw new Error(messages_1.errorMessages.userAlreadyVerified);
    }
};
const checkVerificationCodeExpiration = (user, currentDate) => {
    if (isVerificationCodeExpired(user, currentDate)) {
        throw new Error(messages_1.errorMessages.verificationCodeExpired);
    }
};
const checkInvalidVerificationCode = (user, verificationCode) => {
    if (isInvalidVerificationCode(user, verificationCode)) {
        throw new InvalidVerificationCodeError(messages_1.errorMessages.invalidVerificationCode);
    }
};
const handleEmailVerification = async (userId) => {
    await markEmailAsVerified(userId);
};
const handleUserVerification = async (userId, isPhoneVerified) => {
    if (isPhoneVerified) {
        await markUserAsVerified(userId);
    }
};
const handleVerification = async (user, verificationCode, currentDate) => {
    checkUserVerificationStatus(user);
    checkVerificationCodeExpiration(user, currentDate);
    checkInvalidVerificationCode(user, verificationCode);
    await handleEmailVerification(user.id);
    await handleUserVerification(user.id, user.isPhoneVerified);
};
class UnauthorizedError extends Error {
    constructor(message) {
        super(message);
        this.name = 'UnauthorizedError';
    }
}
class ForbiddenError extends Error {
    constructor(message) {
        super(message);
        this.name = 'ForbiddenError';
    }
}
class InvalidVerificationCodeError extends Error {
    constructor(message) {
        super(message);
        this.name = 'InvalidVerificationCodeError';
    }
}
const verifyUser = async (req, res) => {
    const { username, verificationCode } = req.body;
    try {
        const user = await findUserByUsername(username);
        if (!user) {
            return res.status(400).json({
                msg: messages_1.errorMessages.userNotExists(username),
            });
        }
        const currentDate = new Date();
        await handleVerification(user, verificationCode, currentDate);
        res.json({
            msg: messages_1.successMessages.userVerified,
        });
    }
    catch (error) {
        if (error instanceof InvalidVerificationCodeError) {
            return res.status(403).json({
                msg: error.message,
            });
        }
        else if (error instanceof UnauthorizedError) {
            return res.status(401).json({
                msg: error.message,
            });
        }
        res.status(400).json({
            msg: messages_1.errorMessages.databaseError,
            error: error.message,
        });
    }
};
exports.verifyUser = verifyUser;
