import type { SwitchCatalog } from '../prepare/switchCatalogHelper';
import { digitalSubscriptionTargetInformation } from './digitalSubscriptionTargetInformation';
import { supporterPlusTargetInformation } from './supporterPlusTargetInformation';

export const switchCatalog = {
	Contribution: {
		Annual: {
			SupporterPlus: {
				Annual: supporterPlusTargetInformation,
			},
		},
		Monthly: {
			SupporterPlus: {
				Monthly: supporterPlusTargetInformation,
			},
		},
	},
	SupporterPlus: {
		Annual: {
			DigitalSubscription: {
				Annual: digitalSubscriptionTargetInformation,
			},
		},
		Monthly: {
			DigitalSubscription: {
				Monthly: digitalSubscriptionTargetInformation,
			},
		},
	},
} as const satisfies SwitchCatalog;
