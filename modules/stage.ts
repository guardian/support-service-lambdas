export type Stage = 'CODE' | 'CSBX' | 'PROD';

export const stageFromEnvironment = (): Stage => {
	const stage = process.env.Stage;
	if (stage === undefined) {
		throw new Error('Stage is not defined as an environment variable');
	}
	return stage as Stage;
};
