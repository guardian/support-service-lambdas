import type { ZuoraClient } from '@modules/zuora/zuoraClient';
import { z } from 'zod';

const ratePlanChargeSchema = z.object({
	price: z.string().optional(),
	currency: z.string(),
});

const ratePlanSchema = z.object({
	id: z.string(),
	ratePlanCharges: z.array(ratePlanChargeSchema),
});

const minimalZuoraSubscriptionSchema = z.object({
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
