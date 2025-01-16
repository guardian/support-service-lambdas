import { SendMessageCommand, SQSClient } from '@aws-sdk/client-sqs';

const client = new SQSClient({});

export const sendMessageToSqsQueue = async ({
	queueUrl,
	messageBody,
}: {
	queueUrl: string;
	messageBody: string;
}) => {
	console.log('Sending message to SQS queue...');
	console.log(messageBody);
	try {
		const input = {
			QueueUrl: queueUrl,
			MessageBody: messageBody,
		};
		const command = new SendMessageCommand(input);
		const response = await client.send(command);
		console.log(response);

		// { // SendMessageResult
		//   MD5OfMessageBody: "STRING_VALUE",
		//   MD5OfMessageAttributes: "STRING_VALUE",
		//   MD5OfMessageSystemAttributes: "STRING_VALUE",
		//   MessageId: "STRING_VALUE",
		//   SequenceNumber: "STRING_VALUE",
		// };
	} catch (error) {
		console.error(error);
		throw error;
	}
};

// def toJsonContributorRowSqsMessage: String = {
//     ContributorRowSqsMessage(
//       To = ToSqsMessage(
//         Address = email,
//         SubscriberKey = email,
//         ContactAttributes = ContactAttributesSqsMessage(
//           SubscriberAttributes = SubscriberAttributesSqsMessage(
//             EmailAddress = email,
//             edition = edition,
//             `payment method` = renderPaymentMethod,
//             currency,
//             amount = amount.setScale(2).toString,
//             first_name = firstName,
//             date_of_payment = formattedDate,
//           ),
//         ),
//       ),
//       DataExtensionName = "contribution-thank-you",
//       IdentityUserId = identityId.toString,
//     ).asJson.toString()
//   }
// }
