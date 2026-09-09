import { buildPaymentFailureExitPayload, getBrazeClient } from '../helpers';

export const sendPaymentFailureExitEvent = async (
	brazeUuid: string,
	time: string,
): Promise<void> => {
	const { client, appId } = await getBrazeClient();
	await client.sendCustomEvent(
		buildPaymentFailureExitPayload(brazeUuid, appId, time),
	);
};
