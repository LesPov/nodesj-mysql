"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.resendVerificationCode = void 0;
const authModel_1 = require("../../../models/authModel");
const messages_1 = require("../../../middleware/messages");
const verificationModel_1 = require("../../../models/verificationModel");
const emailUtils_1 = require("../../../utils/emailUtils");
const VERIFICATION_CODE_EXPIRATION_HOURS = 24;
const generateVerificationCode = () => Math.floor(100000 + Math.random() * 900000).toString();
const calculateExpirationDate = () => {
    const expirationDate = new Date();
    expirationDate.setHours(expirationDate.getHours() + VERIFICATION_CODE_EXPIRATION_HOURS);
    return expirationDate;
};
const findOrCreateVerificationRecord = async (userId) => {
    let verificationRecord = await verificationModel_1.Verification.findOne({ where: { userId } });
    if (!verificationRecord) {
        verificationRecord = await verificationModel_1.Verification.create({ userId });
    }
    return verificationRecord;
};
const updateVerificationCodeInfo = async (verificationRecord, newVerificationCode, expirationDate) => {
    await verificationRecord.update({ verificationCode: newVerificationCode, verificationCodeExpiration: expirationDate });
};
const sendVerificationCodeByEmail = async (email, username, newVerificationCode) => {
    return (0, emailUtils_1.sendVerificationEmail)(email, username, newVerificationCode);
};
const isUserNotVerified = (user) => !user || !user.verification.isEmailVerified;
const resendVerificationCode = async (req, res) => {
    const { username } = req.body;
    try {
        const user = await authModel_1.Auth.findOne({ where: { username }, include: [verificationModel_1.Verification] });
        if (isUserNotVerified(user)) {
            const newVerificationCode = generateVerificationCode();
            const expirationDate = calculateExpirationDate();
            const verificationRecord = await findOrCreateVerificationRecord(user.id);
            await updateVerificationCodeInfo(verificationRecord, newVerificationCode, expirationDate);
            const emailSent = await sendVerificationCodeByEmail(user.email, user.username, newVerificationCode);
            if (emailSent) {
                res.json({
                    msg: messages_1.successMessages.verificationCodeResent,
                });
            }
            else {
                res.status(500).json({
                    msg: messages_1.errorMessages.emailVerificationError,
                });
            }
        }
        else {
            res.status(400).json({
                msg: messages_1.errorMessages.userAlreadyVerified,
            });
        }
    }
    catch (error) {
        res.status(500).json({
            msg: messages_1.errorMessages.databaseError,
            error,
        });
    }
};
exports.resendVerificationCode = resendVerificationCode;
