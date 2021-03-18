package com.gu.soft_opt_in_consent_setter

case class SoftOptInConfig(sfConfig: SalesforceConfig, identityConfig: IdentityConfig)

case class SalesforceConfig(
  authUrl: String,
  clientId: String,
  clientSecret: String,
  userName: String,
  password: String,
  token: String
)

case class IdentityConfig(IdentityUrl: String, IdentityToken: String)
