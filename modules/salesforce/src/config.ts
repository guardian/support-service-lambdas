export const sfApiVersion = (): string => {
	const sfApiVersion = process.env.SF_API_VERSION;

	if (!sfApiVersion) {
		return 'v54.0';
	}
	return sfApiVersion;
};