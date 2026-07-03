import { z } from 'zod';
import { isoCurrencySchema } from '@modules/internationalisation/schemas';
import type { ZuoraClient } from '@modules/zuora/zuoraClient';

const ratePlanChargeSchema = z.object({
	price: z.number().nullable(),
	currency: isoCurrencySchema,
});

const ratePlanSchema = z.object({
	id: z.string(),
	productRatePlanId: z.string(),
	ratePlanCharges: z.array(ratePlanChargeSchema),
});

const minimalZuoraSubscriptionSchema = z.object({
	subscriptionNumber: z.string(),
	ratePlans: z.array(ratePlanSchema),
});

export type MinimalZuoraSubscription = z.infer<
	typeof minimalZuoraSubscriptionSchema
>;

export class ZuoraSubscriptionService {
	constructor(private readonly zuoraClient: ZuoraClient) {}

	async getSubscription(id: string): Promise<MinimalZuoraSubscription> {
		return await this.zuoraClient.get(
			`/v1/subscriptions/${id}`,
			minimalZuoraSubscriptionSchema,
		);
	}
}
