package com.gu.sf_emails_to_s3_exporter

case class Config(
    sfConfig: SalesforceConfig,
    s3Config: S3Config,
)

case class SalesforceConfig(
    authUrl: String,
    clientId: String,
    clientSecret: String,
    userName: String,
    password: String,
    token: String,
    apiVersion: String,
)

case class S3Config(
    bucketName: String,
)

object Config {
  lazy val fromEnvironment: Option[Config] = {
    for {
      salesForceConnectedAppSecrets <- Secrets.getSalesforceConnectedAppSecrets
      salesForceUserSecrets <- Secrets.getSalesforceUserSecrets
      sfApiVersion <- Option(System.getenv("sfApiVersion"))
      s3BucketName <- Option(System.getenv("bucketName"))
    } yield Config(
      SalesforceConfig(
        userName = salesForceUserSecrets.sfUsername,
        clientId = salesForceConnectedAppSecrets.clientId,
        clientSecret = salesForceConnectedAppSecrets.clientSecret,
        password = salesForceUserSecrets.sfPassword,
        token = salesForceUserSecrets.sfToken,
        authUrl = salesForceConnectedAppSecrets.authUrl,
        apiVersion = sfApiVersion,
      ),
      S3Config(
        bucketName = s3BucketName.toLowerCase(),
      ),
    )
  }
}
