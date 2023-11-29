import type { Dayjs } from 'dayjs';

export const zuoraServerUrl = (stage: string) => {
	if (stage === 'PROD') {
		return 'https://rest.zuora.com';
	}
	return 'https://rest.apisandbox.zuora.com';
};

export const zuoraDateFormat = (date: Dayjs) => date.format('YYYY-MM-DD');

export const checkDefined = <T>(
	value: T | undefined | null,
	errorMessage: string,
): T => {
	if (!value) {
		throw new Error(errorMessage);
	}
	return value;
};
