## IAM Policies

This CDK-only handler currently adds a single role to janus.  This allows daily development AWS access.

It allows developers to access CODE and DEV config and other resources, while blocking access to PROD resources.  It
should support all common non-PROD development tasks (if something is missing, add it).

This gives additional safety due to lower trust with the local machine (for any reason, including AI agents or
phishing/compromise)

PROD resources/logs access should only be gained when specifically needed, through a short term credential.

### Developing

Do a PR as normal and once in PROD, the policy will be updated for everyone getting fresh credentials.

### Using CODE

For testing, you can deploy iam-policies to CODE.

This will add a "Local Development CODE (for testing the policy itself)" role in Janus which will be available to anyone
who has the main policy.

Be sure to drop the `support-CODE-iam-policies` stack once you have finished, to remove it from everyone's Janus home
page.

### pnpm update-stack

Note: At the moment, the dev credential doesn't allow cloudformation updates.  If you want to use `pnpm update-stack`
you will need to either refetch admin credentials, or fetch them as "membershipAdmin" or similar, and temporarily change
the `aws cloudformation update-stack` command in `update-stack.sh` to use `membershipAdmin` instead of `membership`.
