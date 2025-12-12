export const membershipHostedZoneId = 'Z1E4V12LQGXFEC';
export const membershipCertificateId = 'c1efc564-9ff8-4a03-be48-d1990a3d79d2';
export const membershipApisDomain = 'membership.guardianapis.com';

export const certForStack = {
	support: {
		certificateId: 'b384a6a0-2f54-4874-b99b-96eeff96c009',
		domainName: 'support.guardianapis.com',
		hostedZoneId: 'Z3KO35ELNWZMSX',
	},
	membership: {
		certificateId: membershipCertificateId,
		domainName: membershipApisDomain,
		hostedZoneId: membershipHostedZoneId,
	},
} as const;
