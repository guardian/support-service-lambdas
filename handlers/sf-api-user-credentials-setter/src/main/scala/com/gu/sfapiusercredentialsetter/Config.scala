package com.gu.sfapiusercredentialsetter

case class Config(salesforceConfig: SalesforceConfig, awsConfig: AwsConfig)

case class SalesforceConfig(
    authUrl: String,
    clientId: String,
    clientSecret: String,
    userName: String,
    password: String,
    token: String,
)

case class AwsConfig(
    stageName: String,
)
