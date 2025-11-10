import type { Stage } from '@modules/stage';

export function getAppBaseUrl(stage: Stage, app: string): string {
	switch (stage) {
		case 'CODE':
			return `https://${app}-code.support.guardianapis.com`;
		case 'PROD':
			return `https://${app}.support.guardianapis.com`;
	}
}

export const app = 'staff-access';
