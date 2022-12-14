package com.gu.digitalvouchersuspensionprocessor

import com.gu.imovo.ImovoConfig
import com.gu.salesforce.SFAuthConfig

case class Config(salesforce: SFAuthConfig, imovo: ImovoConfig)

object Config {

  def envVal(name: String): Either[ConfigFailure, String] =
    sys.env.get(name).toRight(ConfigFailure(s"No value in environment for '$name'"))

  def fromEnv(): Either[ConfigFailure, Config] =
    for {
      sfUrl <- envVal("salesforceUrl")
      sfClientId <- envVal("salesforceClientId")
      sfClientSecret <- envVal("salesforceClientSecret")
      sfUserName <- envVal("salesforceUserName")
      sfPassword <- envVal("salesforcePassword")
      sfToken <- envVal("salesforceToken")
      imovoUrl <- envVal("imovoUrl")
      imovoApiKey <- envVal("imovoApiKey")
    } yield Config(
      salesforce = SFAuthConfig(
        url = sfUrl,
        client_id = sfClientId,
        client_secret = sfClientSecret,
        username = sfUserName,
        password = sfPassword,
        token = sfToken,
      ),
      imovo = ImovoConfig(
        imovoBaseUrl = imovoUrl,
        imovoApiKey = imovoApiKey,
      ),
    )
}
