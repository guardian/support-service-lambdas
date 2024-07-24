export const sfApiVersion = (): string => {
	const sfApiVersion = process.env.SF_API_VERSION;

	if (!sfApiVersion) {
		return 'v59.0'; //latest version as of July '24
	}
	return sfApiVersion;
};
