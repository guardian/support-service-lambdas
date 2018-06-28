package com.gu.sfContactMerge

import java.io.{InputStream, OutputStream}

import com.amazonaws.services.lambda.runtime.Context
import com.gu.effects.RawEffects
import com.gu.util.apigateway.ApiGatewayHandler.{LambdaIO, Operation}
import com.gu.util.apigateway.{ApiGatewayHandler, ApiGatewayResponse}
import com.gu.util.config.ConfigReads.ConfigFailure
import com.gu.util.config.{LoadConfig, Stage}
import com.gu.util.reader.Types._
import com.gu.util.zuora.ZuoraRestConfig
import play.api.libs.json.{Json, Reads}
import scalaz.\/

object Handler {

  case class StepsConfig(zuoraRestConfig: ZuoraRestConfig)

  implicit val stepsConfigReads: Reads[StepsConfig] = Json.reads[StepsConfig]

  // Referenced in Cloudformation
  def apply(inputStream: InputStream, outputStream: OutputStream, context: Context): Unit = {
    runWithEffects(RawEffects.stage, RawEffects.s3Load, LambdaIO(inputStream, outputStream, context))
  }

  def runWithEffects(stage: Stage, s3Load: Stage => ConfigFailure \/ String, lambdaIO: LambdaIO) = {

    ApiGatewayHandler[StepsConfig](lambdaIO) {
      for {
        config <- LoadConfig.default[StepsConfig](implicitly)(stage, s3Load(stage))
          .toApiGatewayOp("load config")
        configuredOp = Operation.noHealthcheck(req => ApiGatewayResponse.notFound("implementation Not Found (yet)"), false)
      } yield (config, configuredOp)
    }

  }

}
