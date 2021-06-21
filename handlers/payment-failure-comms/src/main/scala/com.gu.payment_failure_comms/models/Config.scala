package com.gu.payment_failure_comms.models

case class Config(braze: BrazeConfig)

case class BrazeConfig(instanceUrl: String, bearerToken: String)

object Config {
  def apply(): Either[Failure, Config] = {
    (for {
      instanceUrl <- sys.env.get("brazeInstanceUrl")
      bearerToken <- sys.env.get("brazeBearerToken")
    } yield Config(
      BrazeConfig(instanceUrl, bearerToken)
    ))
      .toRight(
        ConfigFailure("Could not obtain all config.")
      )
  }
}