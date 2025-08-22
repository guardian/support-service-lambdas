import type { Logger } from '@modules/logger';

export interface MockLogger extends Logger {
	log: jest.MockedFunction<Logger['log']>;
	mutableAddContext: jest.MockedFunction<Logger['mutableAddContext']>;
}

export const createMockLogger = (): MockLogger => ({
	log: jest.fn(),
	mutableAddContext: jest.fn(),
});

export interface MockSecretValue {
	getSecretValue: jest.MockedFunction<(secretName: string) => Promise<unknown>>;
}

export interface MockSalesforceAuth {
	authenticateWithSalesforce: jest.MockedFunction<
		(...args: unknown[]) => Promise<unknown>
	>;
}

export interface MockSalesforceCreate {
	upsertPaymentDisputeInSalesforce: jest.MockedFunction<
		(...args: unknown[]) => Promise<unknown>
	>;
}

export interface MockMapper {
	mapStripeDisputeToSalesforce: jest.MockedFunction<
		(...args: unknown[]) => unknown
	>;
}
