# Config cats effect

This library provides a thin wrapper around [simple-configuration](https://github.com/guardian/simple-configuration), 
cats-effect and config-circe. With the aim of providing a consistent way of loading config in handlers.

# Usage

For example code for loading config see:
* [src/test/scala/com/gu/util/config/ConfigCatsExample.scala](src/test/scala/com/gu/util/config/ConfigCatsExample.scala)

The config loader will load config from the aws property store based on the supplied
[simple-configuration](https://github.com/guardian/simple-configuration) AppIdentity.

You can create properties in the aws property store as follows

To update a 'non-secret' parameter use the following aws cli command:

```bash
aws --profile membership ssm put-parameter --overwrite --type String --name /<stage>/membership-<stage>-<app-name>/<app-name>-<stage>/<parameter key> --value <parameter value>
```

To update a 'secret' parameter such as api keys and passwords use the following aws cli command:

```bash
aws --profile membership ssm put-parameter --overwrite --type SecureString --key-id 302bd430-2d97-4984-8625-b55a70691b49 --name /<stage>/membership-<stage>-<app-name>/<app-name>-<stage>/<parameter key> --value <parameter value>
```

For example these command would create the properties for the [example app](src/test/scala/com/gu/util/config/ConfigCatsExample.scala):
```$bash
aws --profile membership ssm put-parameter --overwrite --type String --name /CODE/membership-CODE-example-app/example-app-CODE/example --value  example-value
aws --profile membership ssm put-parameter --overwrite --type SecureString --key-id 302bd430-2d97-4984-8625-b55a70691b49 --name /CODE/membership-CODE-example-app/example-app-CODE/secretExample --value secret-example-value
```