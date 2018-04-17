package com.gu.identityBackfill.salesforce

import com.gu.effects.RawEffects
import com.gu.identityBackfill.Handler.StepsConfig
import com.gu.util.{Config, Stage}
import scalaz.syntax.std.either._

object DevSFEffects {
  def apply(effects: RawEffects) = {
    for {
      configAttempt <- effects.s3Load(Stage("DEV")).toEither.disjunction
      config <- Config.parseConfig[StepsConfig](configAttempt)
      auth <- SalesforceAuthenticate(effects.response, config.stepsConfig.sfConfig)
    } yield auth
  }
}
