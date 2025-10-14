export type Stage = 'CODE' | 'PROD';

export const stageFromEnvironment = (): Stage => {
	const stage = process.env.STAGE;
	if (stage === undefined) {
		throw new Error('Stage is not defined as an environment variable');
	}
	return stage as Stage;
};
