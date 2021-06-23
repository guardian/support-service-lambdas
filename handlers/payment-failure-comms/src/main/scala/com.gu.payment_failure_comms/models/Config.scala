package com.gu.payment_failure_comms.models

case class Config(braze: BrazeConfig)

case class BrazeConfig(instanceUrl: String, bearerToken: String, zuoraAppId: String)

object Config {
  def apply(): Either[Failure, Config] = {
    for {
      instanceUrl <- sys.env.get("brazeInstanceUrl")
        .toRight(ConfigFailure("Could not obtain brazeInstanceUrl."))
      bearerToken <- sys.env.get("brazeBearerToken")
        .toRight(ConfigFailure("Could not obtain brazeBearerToken."))
      zuoraAppId <- sys.env.get("zuoraAppIdForBraze")
        .toRight(ConfigFailure("Could not obtain zuoraAppIdForBraze."))
    } yield Config(
      BrazeConfig(instanceUrl, bearerToken, zuoraAppId)
    )
  }
}
