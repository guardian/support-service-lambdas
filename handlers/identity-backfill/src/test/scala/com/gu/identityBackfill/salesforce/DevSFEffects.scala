package com.gu.identityBackfill.salesforce

import com.gu.effects.RawEffects
import com.gu.identityBackfill.Handler.StepsConfig
import com.gu.util.{Config, Stage}
import okhttp3.{Request, Response}
import scalaz.syntax.std.either._

object DevSFEffects {
  def apply(effects: RawEffects, response: Request => Response) = {
    for {
      configAttempt <- effects.s3Load(Stage("DEV")).toEither.disjunction
      config <- Config.parseConfig[StepsConfig](configAttempt)
      auth <- SalesforceAuthenticate(response, config.stepsConfig.sfConfig)
    } yield auth
  }
}
