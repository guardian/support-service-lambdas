import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { z } from 'zod';
import { getStatusOfDataSubjectRequest } from '../../apis/data-subject-requests';
import { DataSubjectAPI, MParticleClient } from '../../apis/mparticleClient';

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
