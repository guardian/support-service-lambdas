#Digital Voucher Cancellation Processor

This processor co-ordinates the cancellation of digital voucher redemption via the imovo api. 

#Cloudformation

This project uses cdk typescript to create cloud formation for the processor. For more detail see:

* [https://docs.aws.amazon.com/cdk/latest/guide/home.html](https://docs.aws.amazon.com/cdk/latest/guide/home.html)
* [../../cdk/README.md](../../cdk/README.md)

You can generate the clouformation template cdk-cfm.yaml using the script:

```bash
\<\<PROJECT ROOT\>\>/generate_cfn_templates.sh
```

You can manually deploy the generated cloudformation template using the aws cli as follows:

```bash
 aws --profile membership cloudformation deploy --template-file ./cfn.yaml --stack-name membership-DEV-digital-voucher-cancellation-processor --parameter-overrides Stage=DEV --capabilities CAPABILITY_IAM
```

#Config

The configuration for this application is stored in the [aws parameter store](https://docs.aws.amazon.com/systems-manager/latest/userguide/systems-manager-parameter-store.html).

The configuration can be updated using the [aws cli](https://docs.aws.amazon.com/cli/latest/userguide/install-cliv2.html). 

NOTE: Due to a 'feature' in the aws cli you either need to use v2 of the cli or have the following in your '~/.aws/config' file:

```
cli_follow_urlparam=false
``` 

For more details see: https://github.com/aws/aws-cli/issues/2507

Each parameter has a key derived from the configuration case class used in the application. See:

[com.gu.digital_voucher_api.DigitalVoucherApiConfig](src/main/scala/com/gu/digital_voucher_api/ConfigLoader.scala)

To update a 'non-secret' parameter use the following aws cli command:

```bash
aws --profile membership ssm put-parameter --overwrite --type String --name /<stage>/membership-<stage>-digital-voucher-cancellation-processor/digital-voucher-cancellation-processor-<stage>/<parameter key> --value <parameter value>
```

To update a 'secret' parameter such as api keys and passwords use the following aws cli command:

```bash
aws --profile membership ssm put-parameter --overwrite --type SecureString --key-id 302bd430-2d97-4984-8625-b55a70691b49 --name /<stage>/membership-<stage>-digital-voucher-cancellation-processor/digital-voucher-cancellation-processor-<stage>/<parameter key> --value <parameter value>
```

For shared configuration such as salesforce authentication replace the application name with the name assigned to the
shared configuration eg: support-service-lambdas-shared-salesforce

For example configure the applications property in dev using the following commands:
```$bash
aws --region eu-west-1 --profile membership ssm put-parameter --overwrite --type String --name /DEV/membership/support-service-lambdas-shared-imovo/imovoBaseUrl --value  https://core-uat-api.azurewebsites.net
aws --region eu-west-1 --profile membership ssm put-parameter --overwrite --type SecureString --key-id 302bd430-2d97-4984-8625-b55a70691b49 --name /DEV/membership/support-service-lambdas-shared-imovo/imovoApiKey --value xxxxxx
aws --region eu-west-1 --profile membership ssm put-parameter --overwrite --type String --name /DEV/membership/support-service-lambdas-shared-salesforce/url --value https://test.salesforce.com
aws --region eu-west-1 --profile membership ssm put-parameter --overwrite --type String --name /DEV/membership/support-service-lambdas-shared-salesforce/client_id --value xxxx
aws --region eu-west-1 --profile membership ssm put-parameter --overwrite --type SecureString --key-id 302bd430-2d97-4984-8625-b55a70691b49 --name /DEV/membership/support-service-lambdas-shared-salesforce/client_secret --value xxxxxx
aws --region eu-west-1 --profile membership ssm put-parameter --overwrite --type String --name /DEV/membership/support-service-lambdas-shared-salesforce/username --value membersdataapi@guardian.co.uk.dev
aws --region eu-west-1 --profile membership ssm put-parameter --overwrite --type SecureString --key-id 302bd430-2d97-4984-8625-b55a70691b49 --name /DEV/membership/support-service-lambdas-shared-salesforce/password --value xxxxxx
aws --region eu-west-1 --profile membership ssm put-parameter --overwrite --type SecureString --key-id 302bd430-2d97-4984-8625-b55a70691b49 --name /DEV/membership/support-service-lambdas-shared-salesforce/token --value xxxxxx
```