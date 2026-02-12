import { z } from 'zod';

export const promoCodeViewSchema = z.object({
	promo_code: z.string(),
	campaign_code: z.string(),
	promotion_name: z.string(),
	campaign_name: z.string(),
	channel_name: z.string(),
	product_family: z.string(),
	promotion_type: z.string(),
	discount_percent: z.number(),
	discount_months: z.number(),
});

export type PromoCodeViewItem = z.infer<typeof promoCodeViewSchema>;
