## IAM Policies

This CDK-only handler currently adds a single role to janus.  This allows daily development AWS access.

It allows developers to access CODE and DEV config and other resources, while blocking access to PROD resources.  It
should support all common non-PROD development tasks (if something is missing, add it).

This gives additional safety due to lower trust with the local machine (for any reason, including AI agents or
phishing/compromise)

PROD resources/logs access should only be gained when specifically needed, through a short term credential.

### Developing

For simple changes, you can just go ahead and do a PR as normal.

CI is disabled, so once it has been approved and merged, you need to get a manager to deploy
support-service-lambdas::iam-policies to PROD.

If you need to test your policy before rolling out, you can temporarily grant yourself membership-local-dev-CODE in
janus - see [janus#5659](https://github.com/guardian/janus/pull/5659), do your testing by deploying to CODE, and then
revoke the access once complete.
