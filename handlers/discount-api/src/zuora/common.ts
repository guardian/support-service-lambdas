export const zuoraServerUrl = (stage: string) => {
	if (stage === 'PROD') {
		return 'https://rest.zuora.com';
	}
	return 'https://rest.apisandbox.zuora.com';
};
