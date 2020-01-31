package com.gu.holiday_stops

import com.gu.salesforce.SFAuthConfig
import com.gu.util.config.LoadConfigModule.StringFromS3
import com.gu.util.config.{ConfigLocation, LoadConfigModule, Stage}
import com.gu.zuora.ZuoraConfig
import com.gu.zuora.subscription.OverallFailure
import play.api.libs.json.Reads

case class Config(
  zuoraConfig: ZuoraConfig,
  sfConfig: SFAuthConfig
)

object Config {

  private def zuoraCredentials(stage: String, fetchString: StringFromS3): Either[OverallFailure, ZuoraConfig] = {
    credentials[ZuoraConfig](stage, "zuoraRest", fetchString)
  }

  private def salesforceCredentials(stage: String, fetchString: StringFromS3): Either[OverallFailure, SFAuthConfig] = {
    credentials[SFAuthConfig](stage, "sfAuth", fetchString)
  }

  private def credentials[T](stage: String, filePrefix: String, fetchString: StringFromS3)(implicit reads: Reads[T]): Either[OverallFailure, T] = {
    val loadConfigModule = LoadConfigModule(Stage(stage), fetchString)
    loadConfigModule
      .apply[T](ConfigLocation(filePrefix, 1), reads)
      .leftMap(failure => OverallFailure(failure.error))
      .toEither
  }

  def apply(fetchString: StringFromS3): Either[OverallFailure, Config] = {
    val stage = Stage().value
    for {
      zuoraConfig <- zuoraCredentials(stage, fetchString)
      sfConfig <- salesforceCredentials(stage, fetchString)
    } yield {
      stage match {
        case "PROD" =>
          Config(
            zuoraConfig,
            sfConfig
          )
        case "CODE" =>
          Config(
            zuoraConfig,
            sfConfig
          )
        case "DEV" =>
          Config(
            zuoraConfig,
            sfConfig
          )
      }
    }
  }
}
