import {
	GetParametersByPathCommand,
	PutParameterCommand,
	SSMClient,
} from '@aws-sdk/client-ssm';
import { awsConfig } from '@modules/aws/config';
import type { Stage } from '@modules/stage';
import { z } from 'zod';

const zuoraConfigSchema = z.object({
	partnerId: z.string().min(1),
	lastSuccessfulQueryTime: z.string().optional(),
});

export type ZuoraQuerierConfig = z.infer<typeof zuoraConfigSchema>;

const pathToKey = (name: string): string => name.split('/').pop() ?? name;

export class ConfigService {
	constructor(
		private readonly stage: Stage,
		private readonly ssmClient = new SSMClient(awsConfig),
	) {}

	async loadZuoraConfig(): Promise<ZuoraQuerierConfig> {
		const rootPath = `/supporter-product-data/${this.stage}/zuora-config/`;
		const parameters = await this.ssmClient.send(
			new GetParametersByPathCommand({
				Path: rootPath,
				Recursive: false,
				WithDecryption: true,
			}),
		);

		const values = Object.fromEntries(
			(parameters.Parameters ?? []).map((parameter) => [
				pathToKey(parameter.Name ?? ''),
				parameter.Value ?? '',
			]),
		);

		return zuoraConfigSchema.parse(values);
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
