import { stageFromEnvironment } from '@modules/stage';
import { ZuoraClient } from '@modules/zuora/zuoraClient';
import { zuoraSubscriptionSchema } from '@modules/zuora/zuoraSchemas';
import type { ZuoraSubscription } from '@modules/zuora/zuoraSchemas';

export async function getSub(subName: string): Promise<ZuoraSubscription> {
	console.log(`retrieving sub ${subName} from Zuora ...`);

	const zuoraClient = await ZuoraClient.create(stageFromEnvironment());
	const path = `/v1/subscriptions/${subName}`;

	const zuoraGetSubResponse: ZuoraSubscription = await zuoraClient.get(
		path,
		zuoraSubscriptionSchema,
	);

	return zuoraGetSubResponse;
}
