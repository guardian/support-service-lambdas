import type { Dayjs } from 'dayjs';

export const zuoraServerUrl = (stage: string) => {
	switch (stage) {
		case 'PROD':
			return 'https://rest.zuora.com';
		case 'CSBX':
			return 'https://rest.test.zuora.com';
		default:
			return 'https://rest.apisandbox.zuora.com';
	}
};

export const zuoraDateFormat = (date: Dayjs) => date.format('YYYY-MM-DD');
