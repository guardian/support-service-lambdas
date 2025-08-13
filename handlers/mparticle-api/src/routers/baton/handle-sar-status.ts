import type { DataSubjectRequestState } from '../../../interfaces/data-subject-request-state';
import { DataSubjectRequestStatus } from '../../../interfaces/data-subject-request-state';
import { getStatusOfDataSubjectRequest } from '../../apis/data-subject-requests';
import type {
	BatonSarEventStatusResponse,
	InitiationReference,
} from './types-and-schemas';
import {
	DataSubjectAPI,
	MParticleClient,
	mparticleDataSubjectBaseURL,
} from '../../apis/mparticleClient';
import { SRS3Client } from '../../apis/srs3Client';

function mapStatus(
	requestStatus: DataSubjectRequestStatus,
): 'pending' | 'completed' | 'failed' {
	switch (requestStatus) {
		case DataSubjectRequestStatus.Pending:
		case DataSubjectRequestStatus.InProgress:
			return 'pending';
		case DataSubjectRequestStatus.Completed:
		case DataSubjectRequestStatus.Cancelled:
			return 'completed';
		default:
			return 'failed';
	}
}

export const handleSarStatus = async (
	mParticleDataSubjectClient: MParticleClient<DataSubjectAPI>,
	srs3Client: SRS3Client,
	initiationReference: InitiationReference,
) => {
	const dataSubjectRequestState: DataSubjectRequestState =
		await getStatusOfDataSubjectRequest(
			mParticleDataSubjectClient,
			initiationReference,
		);

	let resultLocations: string[] | undefined;
	if (!dataSubjectRequestState.resultsUrl) {
		resultLocations = undefined;
	} else {
		// https://docs.mparticle.com/developers/apis/dsr-api/v3/#example-response-body:~:text=is%203.0.-,results_url,-string

		// strip off the base, then it will be added back on.  This is so there's no chance
		// of accidentally sending our credentials to an untrusted URL.
		const path = dataSubjectRequestState.resultsUrl.replace(
			new RegExp(`^${mparticleDataSubjectBaseURL}`),
			'',
		);
		const stream = await mParticleDataSubjectClient.getStream(path);
		//Readable.fromWeb(response.body)
		if (stream == null) throw new Error('No stream');
		const s3Url = await srs3Client.write(initiationReference, stream);
		resultLocations = [s3Url];
	}

	const response: BatonSarEventStatusResponse = {
		requestType: 'SAR' as const,
		action: 'status' as const,
		status: mapStatus(dataSubjectRequestState.requestStatus),
		message: `mParticle Request Id: "${dataSubjectRequestState.requestId}". Expected completion time: ${dataSubjectRequestState.expectedCompletionTime.toISOString()}.`,
		resultLocations,
	};

	return response;
};
