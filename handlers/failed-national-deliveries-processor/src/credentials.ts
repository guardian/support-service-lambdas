import { STS } from "aws-sdk";
import {
	CredentialProviderChain,
	Credentials,
	EnvironmentCredentials,
	SharedIniFileCredentials,
} from 'aws-sdk/lib/core';

export function credentialProvider(profile: string): CredentialProviderChain {
	return new CredentialProviderChain([
		(): Credentials => new SharedIniFileCredentials({profile}),
		(): Credentials => new EnvironmentCredentials('AWS'),
	]);
}

export function assumeRole(roleToAssume: string): Promise<Credentials> {
	const sts = new STS({apiVersion: '2011-06-15'});
	return sts.assumeRole({
		RoleArn: roleToAssume,
		RoleSessionName: 'tracker',
	}).promise().then((data) => {
		if (data.Credentials) {
			return new Credentials({
				accessKeyId: data.Credentials.AccessKeyId,
				secretAccessKey: data.Credentials.SecretAccessKey,
				sessionToken: data.Credentials.SessionToken
			})
		} else {
			return Promise.reject("Could not get credentials from AWS")
		}
	})
}