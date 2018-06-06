package com.gu.identityBackfill.salesforce

import com.gu.identityBackfill.Handler.StepsConfig
import com.gu.util.config.ConfigReads.ConfigFailure
import com.gu.util.config.{LoadConfig, Stage}
import okhttp3.{Request, Response}
import scalaz.\/
import scalaz.syntax.std.either._

object DevSFEffects {
  def apply(s3Load: Stage => ConfigFailure \/ String, response: Request => Response) = {
    for {
      configAttempt <- s3Load(Stage("DEV")).toEither.disjunction
      config <- LoadConfig.parseConfig[StepsConfig](configAttempt)
      auth <- SalesforceAuthenticate(response, config.stepsConfig.sfConfig)
    } yield auth
  }
}
