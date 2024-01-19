"use strict";
// controllers/authentication/countryController.ts
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAllCountryCodes = void 0;
const paisModel_1 = require("../../models/paisModel");
const getAllCountryCodes = (_req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const countries = yield paisModel_1.Country.findAll({
            attributes: ['countryCode', 'name'], // Seleccionamos solo countryCode y name
        });
        res.json(countries);
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al obtener los códigos de país.' });
    }
});
exports.getAllCountryCodes = getAllCountryCodes;
