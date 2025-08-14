import { faker } from '@faker-js/faker';
import type {
	GetRequestsResponse,
	PostRequestsResponse,
} from '../src/apis/data-subject-requests';

export const mockSetUserAttributesResponse = '';

export const mockRegisterEventResponse = '';

export function getMockCreateDataSubjectRequestResponse(
	submittedTime: Date,
	requestId: string,
): PostRequestsResponse {
	return {
		expected_completion_time: faker.date.soon(),
		received_time: submittedTime,
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
