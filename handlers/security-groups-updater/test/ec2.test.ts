import {
	AuthorizeSecurityGroupIngressCommand,
	CreateTagsCommand,
	DescribeSecurityGroupsCommand,
	EC2Client,
	RevokeSecurityGroupIngressCommand,
} from '@aws-sdk/client-ec2';
import { mockClient } from 'aws-sdk-client-mock';
import {
	authorizeIngress,
	getIngressPermissions,
	revokeIngress,
	tagSecurityGroup,
} from '../src/ec2';

const ec2Mock = mockClient(EC2Client);

beforeEach(() => {
	ec2Mock.reset();
});

describe('getIngressPermissions', () => {
	test('returns the ip permissions for the security group', async () => {
		ec2Mock.on(DescribeSecurityGroupsCommand).resolves({
			SecurityGroups: [
				{ GroupId: 'sg-123', IpPermissions: [{ FromPort: 443 }] },
			],
		});

		const result = await getIngressPermissions('sg-123');

		expect(result).toEqual([{ FromPort: 443 }]);
		const command = ec2Mock.call(0).firstArg as DescribeSecurityGroupsCommand;
		expect(command.input).toEqual({ GroupIds: ['sg-123'] });
	});

	test('throws if the security group cannot be found', async () => {
		ec2Mock.on(DescribeSecurityGroupsCommand).resolves({ SecurityGroups: [] });

		await expect(getIngressPermissions('sg-123')).rejects.toThrow(
			'Security group sg-123 not found',
		);
	});
});

describe('authorizeIngress', () => {
	test('sends an authorize request when there are permissions to add', async () => {
		ec2Mock.on(AuthorizeSecurityGroupIngressCommand).resolves({});

		await authorizeIngress('sg-123', [{ FromPort: 443 }]);

		expect(ec2Mock.calls().length).toEqual(1);
		const command = ec2Mock.call(0)
			.firstArg as AuthorizeSecurityGroupIngressCommand;
		expect(command.input).toEqual({
			GroupId: 'sg-123',
			IpPermissions: [{ FromPort: 443 }],
		});
	});

	test('does nothing when there are no permissions to add', async () => {
		await authorizeIngress('sg-123', []);

		expect(ec2Mock.calls().length).toEqual(0);
	});
});

describe('revokeIngress', () => {
	test('sends a revoke request when there are permissions to remove', async () => {
		ec2Mock.on(RevokeSecurityGroupIngressCommand).resolves({});

		await revokeIngress('sg-123', [{ FromPort: 443 }]);

		expect(ec2Mock.calls().length).toEqual(1);
		const command = ec2Mock.call(0)
			.firstArg as RevokeSecurityGroupIngressCommand;
		expect(command.input).toEqual({
			GroupId: 'sg-123',
			IpPermissions: [{ FromPort: 443 }],
		});
	});

	test('does nothing when there are no permissions to remove', async () => {
		await revokeIngress('sg-123', []);

		expect(ec2Mock.calls().length).toEqual(0);
	});
});

describe('tagSecurityGroup', () => {
	test('tags the security group', async () => {
		ec2Mock.on(CreateTagsCommand).resolves({});

		await tagSecurityGroup('sg-123', { Updated: '2024-01-01T00:00:00.000Z' });

		const command = ec2Mock.call(0).firstArg as CreateTagsCommand;
		expect(command.input).toEqual({
			Resources: ['sg-123'],
			Tags: [{ Key: 'Updated', Value: '2024-01-01T00:00:00.000Z' }],
		});
	});
});
