import type { EmailMessageWithUserId } from '@modules/email/email';

export class CustomError extends Error {
	subName: string;
	request: EmailMessageWithUserId;
	response: string;

	constructor(
		subName: string,
		request: EmailMessageWithUserId,
		response: string,
	) {
		// Call the parent constructor with a custom message
		super(
			`Error in ${subName}: Request - ${JSON.stringify(request)}, Response - ${response}`,
		);

		// Set the prototype explicitly (necessary for proper instanceof checks in some environments)
		Object.setPrototypeOf(this, CustomError.prototype);

		// Assign the custom properties
		this.subName = subName;
		this.request = request;
		this.response = response;

		// Set the error name for better identification
		this.name = 'CustomError';
	}
}

// Example usage
// try {
//   throw new CustomError('SubscriptionService', 'GET /subscriptions', '404 Not Found');
// } catch (error) {
//   if (error instanceof CustomError) {
//     console.error(error.name);      // CustomError
//     console.error(error.message);   // Error in SubscriptionService: Request - GET /subscriptions, Response - 404 Not Found
//     console.error(error.subName);   // SubscriptionService
//     console.error(error.request);   // GET /subscriptions
//     console.error(error.response);  // 404 Not Found
//   } else {
//     console.error(error);
//   }
// }
