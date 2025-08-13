import { faker } from '@faker-js/faker';
import type {
	GetRequestResponse,
	GetRequestsResponse,
} from '../src/apis/data-subject-requests';

export function getRequestResponse(
	submittedTime: Date,
	requestId: string,
): GetRequestResponse {
	return {
		expected_completion_time: faker.date.soon(),
		received_time: submittedTime,
		subject_request_id: requestId,
		controller_id: faker.string.numeric(),
	};
}

export function getRequestsResponse(requestId: string): GetRequestsResponse {
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
		headers: { entries: () => [['Content-Type', 'application/json']] },
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
