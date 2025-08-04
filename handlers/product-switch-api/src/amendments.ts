import { ZuoraError } from '@modules/zuora/errors/zuoraError';
import type { ZuoraClient } from '@modules/zuora/zuoraClient';
import dayjs from 'dayjs';
import { zuoraSuccessSchema } from '@modules/zuora/types/httpResponse';
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
const amendmentIsPending = (amendment: ZuoraGetAmendmentResponse) =>
	dayjs(amendment.customerAcceptanceDate).isAfter(dayjs());

const amendmentShouldBeDeleted = (
	amendment: ZuoraGetAmendmentResponse | undefined,
) =>
	amendment &&
	amendmentIsPending(amendment) &&
	amendment.status === 'Completed' &&
	amendment.type === 'UpdateProduct';

export const removePendingUpdateAmendments = async (
	zuoraClient: ZuoraClient,
	subscriptionNumber: string,
): Promise<void> => {
	console.log('Checking for pending amendments');
	const lastAmendment = await getLastAmendment(zuoraClient, subscriptionNumber);
	if (amendmentShouldBeDeleted(lastAmendment)) {
		console.log(
			`Subscription ${subscriptionNumber} has a pending update amendment. Deleting it.`,
		);
		await zuoraClient.delete(
			`v1/object/amendment/${lastAmendment?.id}`,
			zuoraSuccessSchema,
		);
		return await removePendingUpdateAmendments(zuoraClient, subscriptionNumber);
	} else {
		console.log(
			`Subscription ${subscriptionNumber} has no pending update amendment. Nothing to do.`,
		);
		return;
	}
};
