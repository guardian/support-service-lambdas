import { GetParameterCommand, SSMClient } from '@aws-sdk/client-ssm';
import { awsConfig } from '@modules/aws/config';
import { ValidationError } from '@modules/utils/errors';
import type { IdentityUserDetails } from '@modules/identity/identity';
import { getIfDefined } from '@modules/utils/nullAndUndefined';
import type { Stage } from '@modules/utils/stage';
import { getUserDetailsSchema } from './schemas';

export const getClientAccessToken = async (stage: Stage) => {
	const ssmClient = new SSMClient(awsConfig);
	const params = {
		Name: `/${stage}/support/press-reader-entitlements/identity-client-access-token`,
		WithDecryption: true,
	};
	const command = new GetParameterCommand(params);
	const response = await ssmClient.send(command);
	return getIfDefined(
		response.Parameter?.Value,
		"Couldn't retrieve identity client access token from parameter store",
	);
};

export async function getUserDetails(
	clientAccessToken: string,
	stage: Stage,
	userId: string,
): Promise<IdentityUserDetails> {
	const identityHost =
		stage === 'CODE'
			? 'https://idapi.code.dev-theguardian.com'
			: 'https://idapi.theguardian.com';

	const response = await fetch(`${identityHost}/user/braze-uuid/${userId}`, {
		headers: {
			'X-GU-ID-Client-Access-Token': `Bearer ${clientAccessToken}`,
		},
		method: 'GET',
	});

	if (response.status == 404) {
		throw new ValidationError(`UserId ${userId} does not exist`);
	}

	const json = await response.json();
	console.log(`Identity returned ${JSON.stringify(json)}`);

	const identityResponse = getUserDetailsSchema.parse(json);
	console.log('Successfully parsed identity response');

	if (identityResponse.status === 'ok') {
		console.log(
			`Retrieved identity id ${identityResponse.id} from userId ${userId}`,
		);
		return {
			identityId: identityResponse.id,
			email: identityResponse.primaryEmailAddress,
		};
	}
	const errorsList = identityResponse.errors.reduce((acc, error) => {
		return acc + error.message + ', ';
	}, 'Errors: ');
	throw new Error(
		`Failed to get identity id because of ${errorsList}, for user ${userId}`,
	);
}
