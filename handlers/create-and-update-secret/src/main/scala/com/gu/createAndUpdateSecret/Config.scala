package com.gu.createAndUpdateSecret

case class Config(salesforceConfig: SalesforceConfig)

case class SalesforceConfig(
  authUrl: String,
  clientId: String,
  clientSecret: String,
  userName: String,
  password: String,
  token: String
)
