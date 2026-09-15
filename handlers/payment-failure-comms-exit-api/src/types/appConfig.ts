import type { z } from 'zod';
import type { appConfigSchema } from '../schemas/appConfigSchema';

export type AppConfig = z.infer<typeof appConfigSchema>;
