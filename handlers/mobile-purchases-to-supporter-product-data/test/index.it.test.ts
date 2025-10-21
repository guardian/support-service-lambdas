/**
 * Integration test for running the lambda
 *
 * @group integration
 */
import type { InputEvent } from '../src';
import { fetchSubscriptionAndDoUpdate } from '../src';
import { getConfig } from '../src/config';

const input: InputEvent = {
	detail: {
		eventName: 'MODIFY',
		dynamodb: {
			ApproximateCreationDateTime: 1760542690,
			Keys: {
				subscriptionId: {
					S: 'iaieeeeigmdlbmfbnpgmemnk.AO-J1OwRSUVECt1QXt3IBNGWebDILubSurkE6Jd5_VDbvkmOWHm_GAwPfkdRnKUeDBi000tFJa6HcBZDY1oIti4Ta4jctGA0Vw',
				},
				userId: { S: '104528145' },
			},
			NewImage: {
				creationTimestamp: { S: '2024-06-10T13:36:31.883Z' },
				subscriptionId: {
					S: 'iaieeeeigmdlbmfbnpgmemnk.AO-J1OwRSUVECt1QXt3IBNGWebDILubSurkE6Jd5_VDbvkmOWHm_GAwPfkdRnKUeDBi000tFJa6HcBZDY1oIti4Ta4jctGA0Vw',
				},
				userId: { S: '104528145' },
			},
			OldImage: {
				creationTimestamp: { S: '2024-06-10T13:36:30.883Z' },
				subscriptionId: {
					S: 'iaieeeeigmdlbmfbnpgmemnk.AO-J1OwRSUVECt1QXt3IBNGWebDILubSurkE6Jd5_VDbvkmOWHm_GAwPfkdRnKUeDBi000tFJa6HcBZDY1oIti4Ta4jctGA0Vw',
				},
				userId: { S: '104528145' },
			},
			SequenceNumber: '10106409100003908108804546921',
			SizeBytes: 538,
			StreamViewType: 'NEW_AND_OLD_IMAGES',
		},
	},
};

test('fetchSubscriptionAndDoUpdate succeeds', async () => {
	const config = await getConfig();
	const result = await fetchSubscriptionAndDoUpdate('CODE', config, input);
	expect(result).toBe(undefined);
});
