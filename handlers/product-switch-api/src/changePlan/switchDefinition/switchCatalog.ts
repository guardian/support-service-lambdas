import type { SwitchCatalog } from '../prepare/switchCatalogHelper';
import { digitalSubscriptionTargetInformation } from './digitalSubscriptionTargetInformation';
import { supporterPlusTargetInformation } from './supporterPlusTargetInformation';

export const switchCatalog = {
	Contribution: {
		Annual: {
			SupporterPlus: {
				Annual: { fromUserInformation: supporterPlusTargetInformation },
			},
		},
		Monthly: {
			SupporterPlus: {
				Monthly: { fromUserInformation: supporterPlusTargetInformation },
			},
		},
	},
	SupporterPlus: {
		Annual: {
			DigitalSubscription: {
				Annual: {
					fromUserInformation: digitalSubscriptionTargetInformation,
				},
			},
		},
		Monthly: {
			DigitalSubscription: {
				Monthly: {
					fromUserInformation: digitalSubscriptionTargetInformation,
				},
			},
		},
	},
} as const satisfies SwitchCatalog;
