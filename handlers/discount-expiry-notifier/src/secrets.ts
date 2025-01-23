import type { Stage } from '@modules/stage';

export function getZuoraSecretName(stage: Stage): string {
	return `${stage}/Zuora-OAuth/SupportServiceLambdas`;
}
export type ZuoraSecret = {
	clientId: string;
	clientSecret: string;
};
