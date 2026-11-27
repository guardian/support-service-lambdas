import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'js-yaml';

type Deployment = {
	type?: string;
	parameters?: {
		bucket?: string;
		bucketSsmLookup?: boolean;
	};
};

type RiffRaffConfig = {
	deployments?: Record<string, Deployment>;
};

const repoRoot = path.resolve(__dirname, '../..');
const handlersRoot = path.join(repoRoot, 'handlers');

const lambdaDeployments = fs
	.readdirSync(handlersRoot, { withFileTypes: true })
	.filter((entry) => entry.isDirectory())
	.flatMap((entry) => {
		const manifestPath = path.join(handlersRoot, entry.name, 'riff-raff.yaml');
		if (!fs.existsSync(manifestPath)) {
			return [];
		}

		const config = yaml.load(
			fs.readFileSync(manifestPath, 'utf8'),
		) as RiffRaffConfig;

		return Object.entries(config.deployments ?? {})
			.filter(([, deployment]) => deployment.type === 'aws-lambda')
			.map(([deploymentName, deployment]) => ({
				deployment,
				deploymentName,
				handlerName: entry.name,
			}));
	});

test.each(lambdaDeployments)(
	'ROOT $handlerName/$deploymentName looks up its artifact bucket from SSM',
	({ deployment }) => {
		expect(deployment.parameters).not.toHaveProperty('bucket');
		expect(deployment.parameters?.bucketSsmLookup).toBe(true);
	},
);
