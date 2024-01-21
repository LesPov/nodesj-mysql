"use strict";
// controllers/authentication/countryController.ts
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAllCountryCodes = void 0;
const paisModel_1 = require("../../../models/paisModel");
const getAllCountryCodes = async (_req, res) => {
    try {
        const countries = await paisModel_1.Country.findAll({
            attributes: ['countryCode', 'name'], // Seleccionamos solo countryCode y name
        });
        res.json(countries);
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al obtener los códigos de país.' });
    }
};
exports.getAllCountryCodes = getAllCountryCodes;
