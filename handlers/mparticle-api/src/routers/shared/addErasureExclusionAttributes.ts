import type {
	EventsAPI,
	MParticleClient,
} from '../../services/mparticleClient';
import { uploadAnEventBatch } from '../../apis/events/uploadAnEventBatch';

// "If you wish to remove users from audiences or from event forwarding during the waiting period, set a user attribute
// and apply audience criteria and/or forwarding rules to exclude them."
// https://docs.mparticle.com/guides/data-subject-requests/#:~:text=If%20you%20wish%20to%20remove%20users%20from%20audiences%20or%20from%20event%20forwarding%20during%20the%20waiting%20period%2C%20set%20a%20user%20attribute%20and%20apply%20audience%20criteria%20and/or%20forwarding%20rules%20to%20exclude%20them.
export const addErasureExclusionAttributes = async (
	mParticleEventsAPIClient: MParticleClient<EventsAPI>,
	environment: 'production' | 'development',
	userId: string,
	submittedTime: string,
): Promise<object> => {
	return uploadAnEventBatch(mParticleEventsAPIClient, {
		userAttributes: {
			dsr_erasure_requested: true,
			dsr_erasure_status: 'requested',
			dsr_erasure_date: submittedTime,
		},
		userIdentities: {
			customer_id: userId,
		},
		environment: environment,
	});
};
