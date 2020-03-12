#Digital Voucher Cancellation Processor

This processor co-ordinates the cancellation of digital voucher redemption via the imovo api. 

Config
======

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

For example:
```$bash
aws --profile membership ssm put-parameter --overwrite --type String --name /DEV/membership-DEV-digital-voucher-cancellation-processor/digital-voucher-cancellation-processor-DEV/imovoBaseUrl --value  https://core-uat-api.azurewebsites.net
aws --profile membership ssm put-parameter --overwrite --type SecureString --key-id 302bd430-2d97-4984-8625-b55a70691b49 --name /DEV/membership-DEV-digital-voucher-cancellation-processor/digital-voucher-cancellation-processor-DEV/imovoApiKey --value xxxxxx
```