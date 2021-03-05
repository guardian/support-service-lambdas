package com.gu.soft_opt_in_consent_setter

case class Config(salesforceConfig: SalesforceConfig)
case class SalesforceConfig(
    authUrl: String,
    clientId: String,
    clientSecret: String,
    userName: String,
    password: String,
    token: String
)
