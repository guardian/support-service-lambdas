export type RuntimeDeps = {
	getBrazeUuidFromIdapi: (identityId: string) => Promise<string | undefined>;
	sendPaymentFailureExitEvent: (
		brazeUuid: string,
		time: string,
	) => Promise<void>;
	now: () => string;
};
