package com.gu.sf_emails_to_s3_exporter

case class Config(
  sfConfig: SalesforceConfig,
  s3Config: S3Config
)

case class SalesforceConfig(
  authUrl: String,
  clientId: String,
  clientSecret: String,
  userName: String,
  password: String,
  token: String,
  apiVersion: String
)

case class S3Config(
  bucketName: String
)

object Config {
  lazy val fromEnvironment: Option[Config] = {
    for {
      sfUserName <- Option(System.getenv("sfUserName"))
      sfClientId <- Option(System.getenv("sfClientId"))
      sfClientSecret <- Option(System.getenv("sfClientSecret"))
      sfPassword <- Option(System.getenv("sfPassword"))
      sfToken <- Option(System.getenv("sfToken"))
      sfAuthUrl <- Option(System.getenv("sfAuthUrl"))
      sfApiVersion <- Option(System.getenv("sfApiVersion"))
      s3BucketName <- Option(System.getenv("bucketName"))
    } yield Config(
      SalesforceConfig(
        userName = sfUserName,
        clientId = sfClientId,
        clientSecret = sfClientSecret,
        password = sfPassword,
        token = sfToken,
        authUrl = sfAuthUrl,
        apiVersion = sfApiVersion
      ),
      S3Config(
        bucketName = s3BucketName.toLowerCase()
      )
    )
  }
}

