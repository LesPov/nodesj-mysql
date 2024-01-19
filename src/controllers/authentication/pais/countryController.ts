// controllers/authentication/countryController.ts

import { Request, Response } from 'express';
import { Country } from '../../../models/paisModel';

export const getAllCountryCodes = async (_req: Request, res: Response) => {
  try {
    const countries = await Country.findAll({
      attributes: ['countryCode', 'name'], // Seleccionamos solo countryCode y name
    });
    res.json(countries);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al obtener los códigos de país.' }); 
  }
};
