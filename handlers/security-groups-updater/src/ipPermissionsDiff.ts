import type { IpPermission } from '@aws-sdk/client-ec2';

export type IpPermissionsDiff = {
	toAuthorize: IpPermission[];
	toRevoke: IpPermission[];
};

function matchesProtocolAndPort(a: IpPermission, b: IpPermission): boolean {
	return (
		a.IpProtocol === b.IpProtocol &&
		a.FromPort === b.FromPort &&
		a.ToPort === b.ToPort
	);
}

function cidrsOf(permission: IpPermission): Set<string> {
	return new Set(
		(permission.IpRanges ?? []).flatMap((range) =>
			range.CidrIp ? [range.CidrIp] : [],
		),
	);
}

/**
 * Finds any cidrs in `permission` that aren't present in any same
 * protocol/port permission in `otherPermissions`, returning a new permission
 * containing only those cidrs, or undefined if there's no difference.
 */
function findCidrsNotIn(
	permission: IpPermission,
	otherPermissions: IpPermission[],
): IpPermission | undefined {
	const matchingPermissions = otherPermissions.filter((other) =>
		matchesProtocolAndPort(permission, other),
	);
	const existingCidrs = new Set(
		matchingPermissions.flatMap((other) => [...cidrsOf(other)]),
	);
	const newCidrs = [...cidrsOf(permission)].filter(
		(cidr) => !existingCidrs.has(cidr),
	);

	return newCidrs.length === 0
		? undefined
		: {
				IpProtocol: permission.IpProtocol,
				FromPort: permission.FromPort,
				ToPort: permission.ToPort,
				IpRanges: newCidrs.map((CidrIp) => ({ CidrIp })),
			};
}

export function buildDesiredIpPermissions(
	cidrs: string[],
	ports: number[],
): IpPermission[] {
	return ports.map((port) => ({
		IpProtocol: 'tcp',
		FromPort: port,
		ToPort: port,
		IpRanges: cidrs.map((CidrIp) => ({ CidrIp })),
	}));
}

/**
 * Compares the current ingress permissions on a security group with the
 * desired ones, returning the minimal set of permissions to authorize
 * (cidrs missing from the current permissions) and revoke (cidrs present
 * currently but not desired), grouped by matching protocol/port.
 *
 * Note this assumes the security group is dedicated to Fastly ingress: any
 * existing permission for a protocol/port combination that isn't part of
 * `desiredPermissions` is revoked in full, not just left alone.
 */
export function diffIpPermissions(
	currentPermissions: IpPermission[],
	desiredPermissions: IpPermission[],
): IpPermissionsDiff {
	return {
		toAuthorize: desiredPermissions.flatMap((permission) => {
			const diff = findCidrsNotIn(permission, currentPermissions);
			return diff ? [diff] : [];
		}),
		toRevoke: currentPermissions.flatMap((permission) => {
			const diff = findCidrsNotIn(permission, desiredPermissions);
			return diff ? [diff] : [];
		}),
	};
}
