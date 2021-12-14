package com.gu.sf_emails_to_s3_exporter

case class SalesforceConfig(
  authUrl: String,
  clientId: String,
  clientSecret: String,
  userName: String,
  password: String,
  token: String,
  apiVersion: String
)

object SalesforceConfig{

  lazy val fromEnvironment : Option[SalesforceConfig] = {
    for{
      sfUserName <- Option(System.getenv("username"))
      sfClientId <- Option(System.getenv("clientId"))
      sfClientSecret <- Option(System.getenv("clientSecret"))
      sfPassword <- Option(System.getenv("password"))
      sfToken <- Option(System.getenv("token"))
      sfAuthUrl <- Option(System.getenv("authUrl"))
      sfApiVersion <- Option(System.getenv("apiVersion"))
    } yield SalesforceConfig(
      userName = sfUserName,
      clientId = sfClientId,
      clientSecret = sfClientSecret,
      password = sfPassword,
      token = sfToken,
      authUrl = sfAuthUrl,
      apiVersion = sfApiVersion
    )
}

}
