package com.gu.payment_failure_comms.models

case class Config(braze: BrazeConfig)

case class BrazeConfig(instanceUrl: String, bearerToken: String)

object Config {
  def apply(): Either[Throwable, Config] = {
    (for {
      instanceUrl <- sys.env.get("brazeInstanceUrl")
      bearerToken <- sys.env.get("brazeBearerToken")
    } yield Config(
      BrazeConfig(instanceUrl, bearerToken)
    ))
      .toRight(
        new Throwable("Could not obtain all config.")
      )
  }
}