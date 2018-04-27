package com.gu.catalogService

import com.gu.effects.RawEffects
import com.gu.util.apigateway.LoadConfig
import com.gu.util.reader.Types._
import com.gu.util.zuora.{ZuoraRestConfig, ZuoraRestRequestMaker}
import com.gu.util.{Logging, Stage}
import okhttp3.{Request, Response}
import play.api.libs.json.{Json, Reads}
import scala.util.Try

object Handler extends Logging {

  case class StepsConfig(zuoraRestConfig: ZuoraRestConfig)
  implicit val stepsConfigReads: Reads[StepsConfig] = Json.reads[StepsConfig]

  // this is the entry point
  // it's referenced by the cloudformation so make sure you keep it in step
  def apply(): Unit = {
    runWithEffects(RawEffects.response, RawEffects.stage, RawEffects.s3Load)
  }

  // this does the wiring except side effects but not any decisions, so can be used for an end to end test
  def runWithEffects(
    response: Request => Response,
    stage: Stage,
    s3Load: Stage => Try[String]
  ): Unit =
    for {
      config <- LoadConfig.default[StepsConfig].run((stage, s3Load(stage))).withLogging("loaded config")
      zuoraRequests = ZuoraRestRequestMaker(response, config.stepsConfig.zuoraRestConfig)
      fetchCatalogAttempt <- ZuoraReadCatalog(zuoraRequests).withLogging("loaded catalog")
    } yield ()




}
