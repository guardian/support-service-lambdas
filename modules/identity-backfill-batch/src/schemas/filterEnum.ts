import { z } from 'zod';

export const filterEnum = z.enum(['has-identity-id', 'no-identity-id', 'all']);
