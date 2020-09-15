package com.gu.sf_billing_account_remover

case class Config(salesforceConfig: SalesforceConfig, zuoraConfig: ZuoraConfig)

case class ZuoraConfig(apiAccessKeyId: String, apiSecretAccessKey: String)

case class SalesforceConfig(authUrl: String,
                            clientId: String,
                            clientSecret: String,
                            userName: String,
                            password: String,
                            token: String)
