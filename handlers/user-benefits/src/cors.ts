export const allowedOriginsForStage = (stage: string): string[] => {
	if (stage === 'PROD') {
		return [
			'https://www.theguardian.com',
			'https://interactive.guim.co.uk',
			'https://membership.theguardian.com',
			'https://profile.theguardian.com',
			'https://support.theguardian.com',
		];
	}
	return [
		'https://m.code.dev-theguardian.com',
		'https://profile.code.dev-theguardian.com',
		'https://profile.thegulocal.com',
		'https://m.thegulocal.com',
		'https://support.code.dev-theguardian.com',
		'https://support.thegulocal.com',
	];
};
