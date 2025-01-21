import type { Stage } from '@modules/stage';

export function getZuoraSecretName(stage: Stage): string {
	switch (stage) {
		case 'CODE':
			return 'CODE/Zuora-OAuth/SupportServiceLambdas';
		case 'PROD':
			return 'PROD/Zuora-OAuth/SupportServiceLambdas';
	}
}
export type ZuoraSecret = {
	clientId: string;
	clientSecret: string;
};
