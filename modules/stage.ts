import { z } from 'zod';

export type Stage = z.infer<typeof stageSchema>;

const stageSchema = z.enum(['CODE', 'PROD']);

export const stageFromEnvironment = (): Stage => {
	const stage = process.env.STAGE;
	return stageSchema.parse(stage, {
		errorMap: () => ({
			message: `Stage environment variable is invalid`,
		}),
	});
};
