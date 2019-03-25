# braze-to-salesforce-file-upload

## How does it work?

1. Braze writes a file to S3 bucket `braze-to-salesforce-file-upload` in `membership` AWS account
1. Lambda `braze-to-salesforce-file-upload` is triggered by an event message which contains the filenames
1. Salesforce REST API uploads csv blob to Salesforce Documents
1. Delete the file from S3 bucket after successful upload to Salesforce

## How do we know when it fails?

Cloudwatch Alert email is sent to SX mailing list.

## How to retry?

After successful upload to Salesforce, files are deleted from S3 bucket. Therefore, to retry upload:

1. check what files are still in the S3 bucket,
1. Download these files locally
1. Re-upload them to S3 bucket
