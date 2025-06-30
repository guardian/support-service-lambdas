import { getSSMParam } from '@modules/aws/ssm';

export async function getSecretValue(parameterStorePath: string, fallbackEnvVarKey?: string): Promise<string> {
    let value: string | undefined;
    try {
        value = await getSSMParam(parameterStorePath);
    } catch (error: unknown) {
        const errorMessage = (error instanceof Error) ? error.message : String(error);
        console.info(`It was not possible to obtain secret value '${parameterStorePath}' from AWS Systems Manager Parameter Store: ${errorMessage}`);
    }

    if (!value && fallbackEnvVarKey) {
        // Fallback to Env vars
        console.info(`Secret value '${parameterStorePath}' fallback to Env var value '${fallbackEnvVarKey}'.`);
        value = process.env[fallbackEnvVarKey];
    }

    if (!value) {
        // Default to empty string
        console.warn(`Secret value '${parameterStorePath}' default to empty string.`);
        value = '';
    }

    return value;
}