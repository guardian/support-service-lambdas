# Redacted real subscription testing

This lets us test the parser on redacted subscriptions that have been seen in PROD in recent days.

It gives us greater confidence that a change will work in real life without breaking within a day or two.

## GDPR and redaction

Although subscriptions don't have much sensitive data, we still need to be careful to look after it.

Risks of using real data are that it could be kept for longer than the retention period, or accidentally
committed to a repo.

- automatically replaces identifiers with arbitrary ids before storing them in the files.
- data should be stored outside of a git root
- tests are not run in CI so nothing could be logged publicly

## How to use

### Download and redact the data
1. get AWS credentials
2. set a suitable location in config.ts - to further reduce the risk of publication don't put it below a git root
3. run downloadRealSubscriptions.ts (this takes up to a minute)

now the location specified will be populated with redacted json files for all subscriptions found in the log files

### Run the test
1. run testRealSubscriptions.test.ts from intellij
