import {
	GetParameterCommand,
	PutParameterCommand,
	SSMClient,
} from '@aws-sdk/client-ssm';
import { awsConfig } from '@modules/aws/config';
import type { Stage } from '@modules/stage';

export class ConfigService {
	constructor(
		private readonly stage: Stage,
		private readonly ssmClient = new SSMClient(awsConfig),
	) {}

	async getPartnerId(): Promise<string> {
		const fullPath = `/supporter-product-data/${this.stage}/zuora-config/partnerId`;
		const parameter = await this.ssmClient.send(
			new GetParameterCommand({
				Name: fullPath,
				WithDecryption: true,
			}),
		);

		if (!parameter.Parameter?.Value) {
			throw new Error(`Parameter ${fullPath} not found`);
		}

		return parameter.Parameter.Value;
	}

	async getLastSuccessfulQueryTime(): Promise<string | undefined> {
		const fullPath = `/supporter-product-data/${this.stage}/zuora-config/lastSuccessfulQueryTime`;
		const parameter = await this.ssmClient.send(
			new GetParameterCommand({
				Name: fullPath,
				WithDecryption: true,
			}),
		);

		if (!parameter.Parameter?.Value) {
			throw new Error(`Parameter ${fullPath} not found`);
		}

		return parameter.Parameter.Value;
	}

	async putLastSuccessfulQueryTime(time: string): Promise<void> {
		const fullPath = `/supporter-product-data/${this.stage}/zuora-config/lastSuccessfulQueryTime`;

		await this.ssmClient.send(
			new PutParameterCommand({
				Name: fullPath,
				Type: 'String',
				Value: time,
				Overwrite: true,
			}),
		);
	}
}
