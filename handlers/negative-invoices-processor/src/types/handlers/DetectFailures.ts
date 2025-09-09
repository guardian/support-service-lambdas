import { z } from 'zod';
import { SaveResultsOutputSchema } from './SaveResults';

export const DetectFailuresInputSchema = SaveResultsOutputSchema;
export type DetectFailuresInput = z.infer<typeof DetectFailuresInputSchema>;
