import { faker } from '@faker-js/faker';
import type { GetRequestsResponse } from '../src/apis/dataSubjectRequests/getStatus';
import type { PostRequestsResponse } from '../src/apis/dataSubjectRequests/submit';

export const mockSetUserAttributesResponse = '';

export const mockRegisterEventResponse = '';

export function getMockCreateDataSubjectRequestResponse(
	requestId: string,
): PostRequestsResponse {
	return {
		expected_completion_time: faker.date.soon(),
		subject_request_id: requestId,
		controller_id: faker.string.numeric(),
	};
}

export function getMockGetSubjectRequestByIdResponse(
	requestId: string,
): GetRequestsResponse {
	return {
		expected_completion_time: faker.date.soon(),
		subject_request_id: requestId,
		controller_id: faker.string.numeric(),
		request_status: 'in_progress',
		results_url: null,
	};
}

export function mockFetchJsonResponse(bodyObject: object, statusCode?: number) {
	(global.fetch as jest.Mock).mockResolvedValueOnce({
		ok: true,
		statusCode: statusCode ?? 200,
		headers: {
			entries: () => [['Content-Type', 'application/json; charset=utf-8']],
		},
		text: () => JSON.stringify(bodyObject),
	});
}

export function mockFetchResponse(
	bodyString: string,
	statusCode?: number,
	contentType?: string,
) {
	(global.fetch as jest.Mock).mockResolvedValueOnce({
		ok: true,
		statusCode: statusCode ?? 200,
		headers: {
			entries: () => (contentType ? [['Content-Type', contentType]] : []),
		},
		text: () => bodyString,
	});
}
