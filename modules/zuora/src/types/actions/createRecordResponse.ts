import { z } from 'zod';
import { zuoraResponseSchema } from '../httpResponse';

export const createRecordResultSchema = zuoraResponseSchema.extend({
	Id: z.string().optional(),
});
