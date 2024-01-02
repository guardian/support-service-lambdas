import type { Dayjs } from 'dayjs';

export const zuoraServerUrl = (stage: string) => {
	if (stage === 'PROD') {
		return 'https://rest.zuora.com';
	}
	return 'https://rest.apisandbox.zuora.com';
};

export const zuoraDateFormat = (date: Dayjs) => date.format('YYYY-MM-DD');
