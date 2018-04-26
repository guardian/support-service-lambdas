package com.gu.catalogService

import com.gu.util.Logging
import com.gu.effects.RawEffects
import com.gu.util.apigateway.LoadConfig
import com.gu.util.zuora.RestRequestMaker.ClientFailableOp
import com.gu.util.zuora.{ZuoraRestConfig, ZuoraRestRequestMaker}
import play.api.libs.json.{JsValue, Json, Reads}
import scalaz.{-\/, \/-}

object Handler extends Logging {

  // this is the entry point
  // it's referenced by the cloudformation so make sure you keep it in step
  def apply(): Unit = {
    runWithEffects(RawEffects.createDefault)
  }

  def runWithEffects(rawEffects: RawEffects): Unit = {

    def operation(fetchCatalogAttempt: ClientFailableOp[JsValue]): Unit = {
      logger.info("Running catalog load operation")
      fetchCatalogAttempt match {
        case -\/(clientFail) => logger.error(s"Failure when loading the catalog: ${clientFail.message}")
        case \/-(catalog) =>
          logger.info(s"Successfully loaded the catalog")
        // Upload to S3
      }
    }

    ScheduledLambdaRunner(rawEffects, operation)

  }

}

object ScheduledLambdaRunner {

  case class StepsConfig(zuoraRestConfig: ZuoraRestConfig)
  implicit val stepsConfigReads: Reads[StepsConfig] = Json.reads[StepsConfig]

  def apply(rawEffects: RawEffects, operation: ClientFailableOp[JsValue] => Unit) = {
    LoadConfig.default[StepsConfig].map { failableConfig =>
      failableConfig.map { config =>
        val zuoraRequests = ZuoraRestRequestMaker(rawEffects.response, config.stepsConfig.zuoraRestConfig)
        operation(ZuoraReadCatalog(zuoraRequests))
      }
    }.run((rawEffects.stage, rawEffects.s3Load(rawEffects.stage)))
  }

}
