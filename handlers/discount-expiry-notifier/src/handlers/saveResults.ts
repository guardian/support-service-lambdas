import { getIfDefined } from '@modules/nullAndUndefined';
import { uploadFileToS3 } from '../s3';

//todo add a type check on the input event
export const handler = async (event: DiscountProcessingEvent) => {
	const bucketName = getIfDefined<string>(
		process.env.S3_BUCKET,
		'S3_BUCKET environment variable not set',
	);

	const discountExpiresOnDate = getIfDefined<string>(
		event.discountExpiresOnDate,
		'event.discountExpiresOnDate variable not set',
	);
	const executionDateTime = new Date().toISOString();
	const { discountProcessingAttempts } = event;

	const successes = discountProcessingAttempts.filter(
		(attempt) => attempt.emailSendAttempt.status === 'success',
	);
	const successesFilePath = generateFilePath(
		discountExpiresOnDate,
		executionDateTime,
		'successes',
	);
	const saveSuccessesAttempt = await uploadFileToS3({
		bucketName,
		filePath: successesFilePath,
		content: JSON.stringify(successes, null, 2),
	});

	const failures = discountProcessingAttempts.filter(
		(attempt) => attempt.emailSendAttempt.status === 'error',
	);
	const failuresFilePath = generateFilePath(
		discountExpiresOnDate,
		executionDateTime,
		'failures',
	);
	const saveFailuresAttempt = await uploadFileToS3({
		bucketName,
		filePath: failuresFilePath,
		content: JSON.stringify(failures, null, 2),
	});

	return {
		successesFilePath: successesFilePath,
		saveSuccessesAttempt,
		failuresFilePath: failuresFilePath,
		saveFailuresAttempt,
	};
};

function generateFilePath(
	discountExpiresOnDate: string,
	executionDateTime: string,
	status: 'successes' | 'failures',
) {
	return `${discountExpiresOnDate}/${status}/${executionDateTime}`;
}

type DiscountProcessingEvent = {
	discountExpiresOnDate: string;
	expiringDiscountsToProcess: ExpiringDiscount[];
	discountProcessingAttempts: DiscountProcessingAttempt[];
};

type ExpiringDiscount = {
	firstName: string;
	nextPaymentDate: string;
	paymentAmount: number;
	paymentCurrency: string;
	paymentFrequency: string;
	productName: string;
	sfContactId: string;
	subName: string;
	workEmail: string;
};

type DiscountProcessingAttempt = {
	detail: DiscountDetail;
	emailSendAttempt: EmailSendAttempt;
};

type DiscountDetail = ExpiringDiscount & {
	status: string;
};

type EmailSendAttempt = {
	status: 'success' | 'error';
	payload: EmailPayload;
	response: EmailResponse;
};

type EmailPayload = {
	To: EmailRecipient;
	DataExtensionName: string;
	SfContactId: string;
};

type EmailRecipient = {
	Address: string;
	ContactAttributes: {
		SubscriberAttributes: SubscriberAttributes;
	};
};

type SubscriberAttributes = {
	EmailAddress: string;
	paymentAmount: string;
	first_name: string;
	date_of_payment: string;
	paymentFrequency: string;
};

type EmailResponse = SuccessResponse | ErrorResponse;

type SuccessResponse = {
	$metadata: Metadata;
	MD5OfMessageBody: string;
	MessageId: string;
};

type ErrorResponse = {
	name: string;
	$fault: string;
	$metadata: Metadata;
	__type: string;
	Code: string;
	Type: string;
};

type Metadata = {
	httpStatusCode: number;
	requestId: string;
	attempts: number;
	totalRetryDelay: number;
};
