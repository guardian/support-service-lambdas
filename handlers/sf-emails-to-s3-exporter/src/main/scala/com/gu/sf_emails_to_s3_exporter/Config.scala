package com.gu.sf_emails_to_s3_exporter

case class Config(salesforceConfig: SalesforceConfig, awsConfig: AwsConfig)

case class SalesforceConfig(
  authUrl: String,
  clientId: String,
  clientSecret: String,
  userName: String,
  password: String,
  token: String
)

case class AwsConfig(
  stageName: String
)
