# security-groups-updater

A scheduled lambda that keeps security group ingress rules on a list of load balancers
in sync with [Fastly's public IP ranges](https://developer.fastly.com/reference/api/utils/public-ip-list/),
so that those load balancers only accept inbound traffic (port 443) from Fastly.

It runs every 60 minutes:

1. fetches Fastly's current list of public IPv4 ranges
2. for each configured security group, compares the current port 443 ingress rules
   against the desired set of Fastly ranges
3. authorizes any new ranges and revokes any ranges that are no longer in Fastly's list
4. tags the security group with an `Updated` timestamp

If Fastly's list can't be fetched or parsed, or contains no valid IPv4 cidrs, the lambda
throws before touching any security group - it never treats "no ranges" as "revoke
everything". See `src/fastly.ts`.

This is a TypeScript/CDK port of the Scala/CloudFormation
[`security-groups-update`](https://github.com/guardian/platform/tree/main/security-groups-update)
lambda in `guardian/platform`. Unlike that lambda, which took a single security group id
and managed ports 80 and 443, this one manages a configurable list of security group ids
and only manages port 443.

The security groups configured for this lambda are expected to be dedicated solely to
Fastly ingress on port 443: any existing ingress rule that doesn't match Fastly's current
IP ranges on port 443 is revoked, not just left alone. Don't point this lambda at a
security group that also needs other ingress rules.

## Configuration

The list of security group ids to manage is hardcoded per stage in `src/securityGroupIds.ts`
This is deliberate: it's security-sensitive configuration, so changing it should go through code
review, and it lets the CDK stack (`cdk/lib/security-groups-updater.ts`) scope the
lambda's IAM permissions to exactly these security groups, rather than allowing it to
mutate any security group in the account.

## Testing

```bash
pnpm --filter security-groups-updater test
```

The AWS EC2 calls and the Fastly HTTP call are mocked in unit tests
(`aws-sdk-client-mock` and `fetch-mock` respectively); the ingress-rule diffing logic
itself is tested as a pure function with no mocking required.

## External documentation

- Fastly public IP list API: https://developer.fastly.com/reference/api/utils/public-ip-list/
- AWS EC2 security group ingress rules: https://docs.aws.amazon.com/AWSEC2/latest/APIReference/API_AuthorizeSecurityGroupIngress.html
