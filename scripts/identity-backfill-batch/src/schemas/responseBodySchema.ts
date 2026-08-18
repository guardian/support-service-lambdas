import { z } from 'zod';

export const responseBodySchema = z.object({ message: z.string().optional() });
