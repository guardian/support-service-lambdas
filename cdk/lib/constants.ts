export const membershipHostedZoneId = 'Z1E4V12LQGXFEC';
export const membershipCertificateId = 'c1efc564-9ff8-4a03-be48-d1990a3d79d2';
export const membershipApisDomain = 'membership.guardianapis.com';
export const supportHostedZoneId = 'Z3KO35ELNWZMSX';
export const supportCertificateId = 'b384a6a0-2f54-4874-b99b-96eeff96c009';
export const supportApisDomain = 'support.guardianapis.com';
export const certForStack = {
	support: {
		certificateId: supportCertificateId,
		domainName: supportApisDomain,
		hostedZoneId: supportHostedZoneId,
	},
	membership: {
		certificateId: membershipCertificateId,
		domainName: membershipApisDomain,
		hostedZoneId: membershipHostedZoneId,
	},
} as const;
