import type { ValidSwitches } from '../prepare/switchesHelper';
import { digitalSubscriptionTargetInformation } from './digitalSubscriptionTargetInformation';
import { supporterPlusTargetInformation } from './supporterPlusTargetInformation';

export const productSwitchesData = {
	Contribution: {
		Annual: {
			SupporterPlus: {
				Annual: supporterPlusTargetInformation,
			},
		},
		Monthly: {
			SupporterPlus: {
				Annual: supporterPlusTargetInformation,
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
} as const satisfies ValidSwitches;
