import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { z } from 'zod';
import {
	DataSubjectAPI,
	MParticleClient,
} from '../../services/mparticleClient';
import { getStatusOfDataSubjectRequest } from '../../apis/dataSubjectRequests/getStatus';

export const requestIdPathParser = {
	path: z.object({
		requestId: z.string().uuid(),
	}),
};

export function getDataSubjectRequestStatusHandler(
	mParticleDataSubjectClient: MParticleClient<DataSubjectAPI>,
) {
	return async (
		event: APIGatewayProxyEvent,
		parsed: { path: { requestId: string }; body: unknown },
	): Promise<APIGatewayProxyResult> => {
		return {
			statusCode: 200,
			body: JSON.stringify(
				await getStatusOfDataSubjectRequest(
					mParticleDataSubjectClient,
					parsed.path.requestId,
				),
			),
		};
	};
}
