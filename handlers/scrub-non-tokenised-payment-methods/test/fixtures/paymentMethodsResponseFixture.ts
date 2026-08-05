import { creditCardFixture } from './creditCardFixture';

export const paymentMethodsResponseFixture = (
	overrides: Record<string, unknown> = {},
) => ({
	defaultPaymentMethodId: 'pm-1',
	paymentGateway: 'Stripe PaymentIntents GNM Membership',
	creditcard: [creditCardFixture()],
	...overrides,
});
