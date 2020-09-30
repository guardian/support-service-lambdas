package com.gu.digitalvouchersuspensionprocessor

import com.gu.salesforce.SFAuthConfig

case class Config(salesforce: SFAuthConfig)

object Config {

  def fromEnv(): Either[ConfigFailure, Config] = {
    def envVal(name: String): Either[ConfigFailure, String] =
      sys.env.get(name).toRight(ConfigFailure(s"No value in environment for '$name'"))

    for {
      url <- envVal("salesforceUrl")
      clientId <- envVal("salesforceClientId")
      clientSecret <- envVal("salesforceClientSecret")
      userName <- envVal("salesforceUserName")
      password <- envVal("salesforcePassword")
      token <- envVal("salesforceToken")
    } yield Config(
      salesforce = SFAuthConfig(
        url = url,
        client_id = clientId,
        client_secret = clientSecret,
        username = userName,
        password = password,
        token = token
      )
    )
  }
}
