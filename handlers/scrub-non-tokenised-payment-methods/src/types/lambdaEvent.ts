import type { PaymentMethodToScrub } from './paymentMethodToScrub';

/** What the distributed map hands to the scrubbing lambda. */
export type LambdaEvent = {
	Items: PaymentMethodToScrub[];
};
