import * as ec2 from '../src/ec2';
import { updateSecurityGroup } from '../src/updateSecurityGroup';

jest.mock('../src/ec2');
const mockEc2 = jest.mocked(ec2);

beforeEach(() => {
	jest.resetAllMocks();
});

test('authorizes new Fastly cidrs and revokes stale ones on port 443', async () => {
	mockEc2.getIngressPermissions.mockResolvedValue([
		{
			IpProtocol: 'tcp',
			FromPort: 443,
			ToPort: 443,
			IpRanges: [{ CidrIp: '1.2.3.4/32' }],
		},
	]);

	await updateSecurityGroup('sg-123', 'my-lb', ['151.101.0.0/16']);

	expect(mockEc2.getIngressPermissions).toHaveBeenCalledWith('sg-123');
	expect(mockEc2.authorizeIngress).toHaveBeenCalledWith('sg-123', [
		{
			IpProtocol: 'tcp',
			FromPort: 443,
			ToPort: 443,
			IpRanges: [{ CidrIp: '151.101.0.0/16' }],
		},
	]);
	expect(mockEc2.revokeIngress).toHaveBeenCalledWith('sg-123', [
		{
			IpProtocol: 'tcp',
			FromPort: 443,
			ToPort: 443,
			IpRanges: [{ CidrIp: '1.2.3.4/32' }],
		},
	]);
	expect(mockEc2.tagSecurityGroup).toHaveBeenCalled();
	const [, tags] = mockEc2.tagSecurityGroup.mock.calls[0] as [
		string,
		Record<string, string>,
	];
	expect(tags.Updated).toEqual(expect.any(String));
});

test('does not authorize or revoke anything when nothing has changed', async () => {
	mockEc2.getIngressPermissions.mockResolvedValue([
		{
			IpProtocol: 'tcp',
			FromPort: 443,
			ToPort: 443,
			IpRanges: [{ CidrIp: '151.101.0.0/16' }],
		},
	]);

	await updateSecurityGroup('sg-123', 'my-lb', ['151.101.0.0/16']);

	expect(mockEc2.authorizeIngress).toHaveBeenCalledWith('sg-123', []);
	expect(mockEc2.revokeIngress).toHaveBeenCalledWith('sg-123', []);
	// still re-tags, so the SG shows it was checked even with no changes
	expect(mockEc2.tagSecurityGroup).toHaveBeenCalled();
});
