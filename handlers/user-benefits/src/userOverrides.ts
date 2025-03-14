import { GetParameterCommand, SSMClient } from '@aws-sdk/client-ssm';
import { awsConfig } from '@modules/aws/config';
import { getIfDefined } from '@modules/nullAndUndefined';
import { userBenefitsOverrideListSchema } from '@modules/product-benefits/schemas';
import type { Stage } from '@modules/stage';

export const getUserOverrides = async (stage: Stage) => {
	const ssmClient = new SSMClient(awsConfig);
	const params = {
		Name: `/${stage}/support/user-benefits-api/user-overrides`,
		WithDecryption: true,
	};
	const command = new GetParameterCommand(params);
	const response = await ssmClient.send(command);
	const parameterStoreValue = getIfDefined(
		response.Parameter?.Value,
		"Couldn't retrieve user overrides list from parameter store",
	);
	return userBenefitsOverrideListSchema.parse(JSON.parse(parameterStoreValue));
};
