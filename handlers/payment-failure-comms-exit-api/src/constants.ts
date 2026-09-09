export const paymentFailureCommsExitPath = '/exit';
export const paymentFailureCommsExitEventName = 'pf_csr_exit';
export const brazeTrackPath = '/users/track';
export const brazeRequestTimeoutMillis = 10_000;

export const identityClientAccessTokenPath = (stage: string): string =>
	`/${stage}/support/payment-failure-comms-exit-api/identity-client-access-token`;
