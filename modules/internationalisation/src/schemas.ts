import { z } from 'zod';
import { CurrencyValues } from '@modules/internationalisation/currency';

export const isoCurrencySchema = z.enum(CurrencyValues);
