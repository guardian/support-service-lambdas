import { GuStringParameter } from '@guardian/cdk/lib/constructs/core';
import type { SrStack } from './SrStack';

/**
 * Looks up a specific piece of app config from SSM to be used in the CFN.
 *
 * If you wish to read a SecureString, note that it will only work with specific
 * properties, see
 *
 * https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/dynamic-references-ssm-secure-strings.html#template-parameters-dynamic-patterns-resources
 */
export class SrAppConfigKey extends GuStringParameter {
	constructor(scope: SrStack, configKey: string, description?: string) {
		const appIdentitySSMPrefix =
			'/' + [scope.stage, scope.stack, scope.app].join('/') + '/';
		super(scope, getId('appConfig', ...configKey.split('/')), {
			description: description ?? `parameter to look up ${configKey} from SSM`,
			fromSSM: true,
			default: appIdentitySSMPrefix + configKey,
		});
	}
}

function getId(resourceName: string, ...items: string[]) {
	return `${resourceName}-${items.join('-')}`;
}
