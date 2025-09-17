import { logger } from '@modules/routing/logger';
import { ZuoraError } from '@modules/zuora/errors/zuoraError';
import { zuoraResponseSchema } from '@modules/zuora/types';
import type { ZuoraClient } from '@modules/zuora/zuoraClient';
import type { Dayjs } from 'dayjs';
import dayjs from 'dayjs';
import type { ZuoraGetAmendmentResponse } from './schemas';
import { zuoraGetAmendmentResponseSchema } from './schemas';

export const getLastAmendment = async (
	zuoraClient: ZuoraClient,
	subscriptionNumber: string,
): Promise<ZuoraGetAmendmentResponse | undefined> => {
	try {
		return await zuoraClient.get(
			`v1/amendments/subscriptions/${subscriptionNumber}`,
			zuoraGetAmendmentResponseSchema,
		);
	} catch (error) {
		if (
			error instanceof ZuoraError &&
			error.zuoraErrorDetails.find((r) => r.code === '50000040')
		) {
			console.log(`No amendments found for subscription ${subscriptionNumber}`);
			return undefined;
		}
		throw error;
	}
};
const amendmentIsPending = (
	amendment: ZuoraGetAmendmentResponse,
	today: Dayjs,
) => dayjs(amendment.customerAcceptanceDate).isAfter(today);

const amendmentShouldBeDeleted = (
	amendment: ZuoraGetAmendmentResponse | undefined,
	today: dayjs.Dayjs,
) =>
	amendment &&
	amendmentIsPending(amendment, today) &&
	amendment.status === 'Completed' &&
	amendment.type === 'UpdateProduct';

export const removePendingUpdateAmendments = async (
	zuoraClient: ZuoraClient,
	subscriptionNumber: string,
	today: dayjs.Dayjs,
): Promise<void> => {
	logger.log('Checking for pending amendments');
	const lastAmendment = await getLastAmendment(zuoraClient, subscriptionNumber);
	if (amendmentShouldBeDeleted(lastAmendment, today)) {
		logger.log(
			`Subscription ${subscriptionNumber} has a pending update amendment. Deleting it.`,
		);
		await zuoraClient.delete(
			`v1/object/amendment/${lastAmendment?.id}`,
			zuoraResponseSchema,
		);
		return await removePendingUpdateAmendments(
			zuoraClient,
			subscriptionNumber,
			today,
		);
	} else {
		logger.log(
			`Subscription ${subscriptionNumber} has no pending update amendment. Nothing to do.`,
		);
		return;
	}
};
