package com.gu.payment_failure_comms.models

case class Config(braze: BrazeConfig)

case class BrazeConfig(instanceUrl: String, bearerToken: String, zuoraAppId: String)

object Config {
  def apply(): Either[Failure, Config] = {
    def getFromEnv(prop: String): Either[ConfigFailure, String] =
      sys.env.get(prop).toRight(ConfigFailure(s"Could not obtain $prop"))

    for {
      instanceUrl <- getFromEnv("brazeInstanceUrl")
      bearerToken <- getFromEnv("brazeBearerToken")
      zuoraAppId <- getFromEnv("zuoraAppIdForBraze")
    } yield Config(
      BrazeConfig(instanceUrl, bearerToken, zuoraAppId)
    )
  }
}
