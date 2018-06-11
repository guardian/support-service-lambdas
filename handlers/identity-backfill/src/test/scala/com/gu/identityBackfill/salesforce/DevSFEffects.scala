package com.gu.identityBackfill.salesforce

import com.gu.identityBackfill.Handler.StepsConfig
import com.gu.util.config.ConfigReads.ConfigFailure
import com.gu.util.config.{LoadConfig, Stage}
import com.gu.util.reader.Types._
import okhttp3.{Request, Response}
import scalaz.\/

object DevSFEffects {
  def apply(s3Load: Stage => ConfigFailure \/ String, response: Request => Response) = {
    for {
      configAttempt <- s3Load(Stage("DEV")).toApiGatewayOp("load config")
      config <- LoadConfig.parseConfig[StepsConfig](configAttempt).toApiGatewayOp("parse config")
      auth <- SalesforceAuthenticate(response, config.stepsConfig.sfConfig)
    } yield auth
  }
}
