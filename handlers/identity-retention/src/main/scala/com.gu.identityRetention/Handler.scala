package com.gu.identityRetention

import java.io.{InputStream, OutputStream}
import com.amazonaws.services.lambda.runtime.Context
import com.gu.effects.RawEffects
import com.gu.util.apigateway.ApiGatewayHandler
import com.gu.util.apigateway.ApiGatewayHandler.{LambdaIO, Operation}
import com.gu.util.config.ConfigReads.ConfigFailure
import com.gu.util.config.{Config, LoadConfig, Stage}
import com.gu.util.reader.Types._
import com.gu.util.zuora.{ZuoraQuery, ZuoraRestConfig, ZuoraRestRequestMaker}
import okhttp3.{Request, Response}
import play.api.libs.json.{Json, Reads}
import scalaz.\/

object Handler {

  case class StepsConfig(zuoraRestConfig: ZuoraRestConfig)

  implicit val stepsConfigReads: Reads[StepsConfig] = Json.reads[StepsConfig]

  // Referenced in Cloudformation
  def apply(inputStream: InputStream, outputStream: OutputStream, context: Context): Unit = {
    runWithEffects(RawEffects.response, RawEffects.stage, RawEffects.s3Load, LambdaIO(inputStream, outputStream, context))
  }

  def runWithEffects(response: Request => Response, stage: Stage, s3Load: Stage => ConfigFailure \/ String, lambdaIO: LambdaIO) = {

    def operation: Config[StepsConfig] => Operation = config => {
      val zuoraRequests = ZuoraRestRequestMaker(response, config.stepsConfig.zuoraRestConfig)
      val zuoraQuerier = ZuoraQuery(zuoraRequests)
      IdentityRetentionSteps.apply(zuoraQuerier)
    }

    ApiGatewayHandler[StepsConfig](lambdaIO)(for {
      config <- LoadConfig.default[StepsConfig](implicitly)(stage, s3Load(stage))
        .toFailableOp("load config")
      configuredOp = operation(config)
    } yield (config, configuredOp))

  }

}
