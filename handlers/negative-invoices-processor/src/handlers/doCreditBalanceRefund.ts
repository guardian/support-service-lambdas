import { stageFromEnvironment } from '@modules/stage';
import { doCreditBalanceRefund } from '@modules/zuora/doCreditBalanceRefund';
import { ZuoraClient } from '@modules/zuora/zuoraClient';
import type { PaymentMethod } from '@modules/zuora/zuoraSchemas';
import dayjs from 'dayjs';
import { z } from 'zod';

export const DoCreditBalanceRefundInputSchema = z.object({
	invoiceId: z.string(),
	accountId: z.string(),
	invoiceNumber: z.string(),
	invoiceBalance: z.number(),
	hasActiveSub: z.boolean(),
	applyCreditToAccountBalanceAttempt: z.object({
		Success: z.boolean(),
	}),
	hasActivePaymentMethod: z.boolean().optional(),
	activePaymentMethods: z
		.array(
			z.object({
				id: z.string(),
				status: z.string(),
				type: z.string(),
				isDefault: z.boolean(),
			}),
		)
		.optional(),
});

export type DoCreditBalanceRefundInput = z.infer<
	typeof DoCreditBalanceRefundInputSchema
>;

export const handler = async (event: DoCreditBalanceRefundInput) => {
	let paymentMethodToRefundTo: PaymentMethod | undefined;

	try {
		const parsedEvent = DoCreditBalanceRefundInputSchema.parse(event);
		const zuoraClient = await ZuoraClient.create(stageFromEnvironment());
		paymentMethodToRefundTo = getPaymentMethodToRefundTo(
			parsedEvent.activePaymentMethods ?? [],
		);
		if (!paymentMethodToRefundTo) {
			throw new Error('No active payment method found to refund to.');
		}
		const body = JSON.stringify({
			AccountId: parsedEvent.accountId,
			Amount: Math.abs(parsedEvent.invoiceBalance),
			SourceType: 'CreditBalance',
			Type: 'External',
			RefundDate: dayjs().format('YYYY-MM-DD'), //today
			MethodType: paymentMethodToRefundTo.type,
		});

		const creditBalanceRefundAttempt = await doCreditBalanceRefund(
			zuoraClient,
			body,
		);

		return {
			...parsedEvent,
			creditBalanceRefundAttempt: {
				...creditBalanceRefundAttempt,
				paymentMethod: paymentMethodToRefundTo,
			},
		};
	} catch (error) {
		return {
			...event,
			creditBalanceRefundAttempt: {
				Success: false,
				paymentMethod: paymentMethodToRefundTo,
				error:
					error instanceof Error
						? error.message
						: JSON.stringify(error, null, 2),
			},
		};
	}
};

function getPaymentMethodToRefundTo(paymentMethods: PaymentMethod[]) {
	const defaultMethod = paymentMethods.find((pm) => pm.isDefault);
	return defaultMethod ?? paymentMethods[0];
}

export const HandlerReturnSchema = DoCreditBalanceRefundInputSchema.extend({
	creditBalanceRefundAttempt: z
		.object({
			Success: z.boolean(),
			error: z.string().optional(),
			paymentMethod: z
				.object({
					id: z.string(),
					status: z.string(),
					type: z.string(),
					isDefault: z.boolean(),
				})
				.optional(),
		})
		.optional(),
});
