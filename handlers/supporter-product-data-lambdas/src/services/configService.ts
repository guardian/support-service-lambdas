import {
	GetParametersByPathCommand,
	PutParameterCommand,
	SSMClient,
} from '@aws-sdk/client-ssm';
import { defaultProvider } from '@aws-sdk/credential-provider-node';
import type { Stage } from '@modules/stage';
import { z } from 'zod';

const zuoraConfigSchema = z.object({
	partnerId: z.string().min(1),
	lastSuccessfulQueryTime: z.string().optional(),
});

export type ZuoraQuerierConfig = z.infer<typeof zuoraConfigSchema> & {
	discountProductRatePlanIds: string[];
};

const discountIdsByStage: Record<Stage, string[]> = {
	CODE: ['2c92c0f852f2ebb20152f9269f067819'],
	PROD: [
		'2c92a00d6f9de7f6016f9f6f52765aa4',
		'2c92a0076ae9189c016b080c930a6186',
		'2c92a0ff5345f9220153559d915d5c26',
		'2c92a0fe7375d60901737c64808e4be1',
		'2c92a0fe750b35d001750d4522f43817',
		'2c92a00f7468817d01748bd88f0d1d6c',
		'2c92a0117468816901748bdb3a8c1ac4',
		'2c92a0086f1426d1016f18a9c71058a5',
		'2c92a0fd6f1426ef016f18a86c515ed7',
		'2c92a0ff64176cd40164232c8ec97661',
		'2c92a00864176ce90164232ac0d90fc1',
		'2c92a0086b25c750016b32548239308d',
		'2c92a0ff74296d7201742b7daf20123d',
		'2c92a00772c5c2e90172c7ebd62a68c4',
		'2c92a01072c5c2e20172c7efe01125c6',
		'2c92a0fe5fe26834015fe33c70a24f50',
		'2c92a0ff5e09bd67015e0a93efe86d2e',
		'2c92a0fe65f0ac1f0165f2189bca248c',
		'2c92a0ff65c757150165c8eab88b788e',
		'2c92a0fc569c311201569dfbecb4215f',
		'2c92a0fc596d31ea01598d623a297897',
		'2c92a01072c5c2e20172c7ee96b91a7c',
		'2c92a0fe72c5c3480172c7f1fb545f81',
		'2c92a00872c5d4770172c7f140a32d62',
		'2c92a01072c5c2e30172c7f0764772c9',
		'2c92a0ff56fe33f301572314aed277fb',
		'2c92a0fc610e738901612d83fce461fd',
		'2c92a0fe56fe33ff015723143e4778be',
		'8a1295918021d0d2018022d4ca0c4aac',
		'8a12865b8021d0d9018022d2a2e52c74',
		'2c92a0086619bf8901661aaac94257fe',
		'2c92a0086619bf8901661ab545f51b21',
		'2c92a0fc5b42d2c9015b6259f7f40040',
		'2c92a0fc6ae918b6016b080950e96d75',
	],
};

const pathToKey = (name: string): string => name.split('/').pop() ?? name;

export class ConfigService {
	constructor(
		private readonly stage: Stage,
		private readonly ssmClient = new SSMClient({
			region: 'eu-west-1',
			credentials: defaultProvider(),
		}),
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

		const parsed = zuoraConfigSchema.parse(values);
		const discountProductRatePlanIds = discountIdsByStage[this.stage];

		return {
			...parsed,
			discountProductRatePlanIds,
		};
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
