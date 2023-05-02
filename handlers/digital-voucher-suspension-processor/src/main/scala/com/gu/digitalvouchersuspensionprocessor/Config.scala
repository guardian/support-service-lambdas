package com.gu.digitalvouchersuspensionprocessor

import com.gu.imovo.ImovoConfig
import com.gu.salesforce.SFAuthConfig

case class Config(salesforce: SFAuthConfig, imovo: ImovoConfig)

object Config {

  def envVal(name: String): Either[ConfigFailure, String] =
    sys.env.get(name).toRight(ConfigFailure(s"No value in environment for '$name'"))

  def get(): Either[ConfigFailure, Config] =
    for {
      salesforceSecrets <- Secrets.getSalesforceSecrets
      membersDataAPISecrets <- Secrets.getMembersDataAPISecrets
      imovoSecrets <- Secrets.getImovoSecrets
      sfUrl <- envVal("salesforceUrl")
      imovoUrl <- envVal("imovoUrl")
    } yield Config(
      salesforce = SFAuthConfig(
        url = sfUrl,
        client_id = salesforceSecrets.clientId,
        client_secret = salesforceSecrets.clientSecret,
        username = membersDataAPISecrets.username,
        password = membersDataAPISecrets.password,
        token = membersDataAPISecrets.token,
      ),
      imovo = ImovoConfig(
        imovoBaseUrl = imovoUrl,
        imovoApiKey = imovoSecrets.imovoAPIKey,
      ),
    )
}
