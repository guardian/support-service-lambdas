import { ValidSwitches } from '../prepare/switchesHelper';
import { supporterPlusTargetInformation } from './supporterPlusTargetInformation';
import { digitalSubscriptionTargetInformation } from './digitalSubscriptionTargetInformation';

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
