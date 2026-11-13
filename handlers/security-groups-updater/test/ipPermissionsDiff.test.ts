import {
	buildDesiredIpPermissions,
	diffIpPermissions,
} from '../src/ipPermissionsDiff';

describe('buildDesiredIpPermissions', () => {
	test('builds one tcp permission per port with all cidrs', () => {
		const result = buildDesiredIpPermissions(
			['151.101.0.0/16', '199.27.72.0/21'],
			[443],
		);

		expect(result).toEqual([
			{
				IpProtocol: 'tcp',
				FromPort: 443,
				ToPort: 443,
				IpRanges: [{ CidrIp: '151.101.0.0/16' }, { CidrIp: '199.27.72.0/21' }],
			},
		]);
	});
});

describe('diffIpPermissions', () => {
	test('authorizes all cidrs when there are no current permissions', () => {
		const desired = buildDesiredIpPermissions(['151.101.0.0/16'], [443]);

		const { toAuthorize, toRevoke } = diffIpPermissions([], desired);

		expect(toAuthorize).toEqual([
			{
				IpProtocol: 'tcp',
				FromPort: 443,
				ToPort: 443,
				IpRanges: [{ CidrIp: '151.101.0.0/16' }],
			},
		]);
		expect(toRevoke).toEqual([]);
	});

	test('is a no-op when current permissions already match desired', () => {
		const permissions = buildDesiredIpPermissions(
			['151.101.0.0/16', '199.27.72.0/21'],
			[443],
		);

		const { toAuthorize, toRevoke } = diffIpPermissions(
			permissions,
			permissions,
		);

		expect(toAuthorize).toEqual([]);
		expect(toRevoke).toEqual([]);
	});

	test('only authorizes new cidrs and only revokes stale cidrs for a port', () => {
		const current = [
			{
				IpProtocol: 'tcp',
				FromPort: 443,
				ToPort: 443,
				IpRanges: [
					{ CidrIp: '151.101.0.0/16' },
					{ CidrIp: '1.2.3.4/32' }, // stale - no longer a Fastly range
				],
			},
		];
		const desired = buildDesiredIpPermissions(
			['151.101.0.0/16', '199.27.72.0/21'], // 199.27.72.0/21 is new
			[443],
		);

		const { toAuthorize, toRevoke } = diffIpPermissions(current, desired);

		expect(toAuthorize).toEqual([
			{
				IpProtocol: 'tcp',
				FromPort: 443,
				ToPort: 443,
				IpRanges: [{ CidrIp: '199.27.72.0/21' }],
			},
		]);
		expect(toRevoke).toEqual([
			{
				IpProtocol: 'tcp',
				FromPort: 443,
				ToPort: 443,
				IpRanges: [{ CidrIp: '1.2.3.4/32' }],
			},
		]);
	});

	test('revokes rules for ports that are not managed, since the security group should only allow Fastly access', () => {
		const current = [
			{
				IpProtocol: 'tcp',
				FromPort: 22,
				ToPort: 22,
				IpRanges: [{ CidrIp: '10.0.0.0/8' }],
			},
		];
		const desired = buildDesiredIpPermissions(['151.101.0.0/16'], [443]);

		const { toAuthorize, toRevoke } = diffIpPermissions(current, desired);

		expect(toAuthorize).toEqual([
			{
				IpProtocol: 'tcp',
				FromPort: 443,
				ToPort: 443,
				IpRanges: [{ CidrIp: '151.101.0.0/16' }],
			},
		]);
		expect(toRevoke).toEqual([
			{
				IpProtocol: 'tcp',
				FromPort: 22,
				ToPort: 22,
				IpRanges: [{ CidrIp: '10.0.0.0/8' }],
			},
		]);
	});
});
