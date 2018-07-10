package com.gu.identityRetention

import java.io.{InputStream, OutputStream}

import com.amazonaws.services.lambda.runtime.Context
import com.gu.effects.{GetFromS3, RawEffects}
import com.gu.util.apigateway.ApiGatewayHandler
import com.gu.util.apigateway.ApiGatewayHandler.{LambdaIO, Operation}
import com.gu.util.config.LoadConfigModule.StringFromS3
import com.gu.util.config.{LoadConfigModule, Stage, TrustedApiConfig}
import com.gu.util.reader.Types._
import com.gu.util.zuora.{ZuoraQuery, ZuoraRestConfig, ZuoraRestRequestMaker}
import okhttp3.{Request, Response}

object Handler {

  // Referenced in Cloudformation
  def apply(inputStream: InputStream, outputStream: OutputStream, context: Context): Unit = {
    runWithEffects(RawEffects.response, RawEffects.stage, GetFromS3.fetchString, LambdaIO(inputStream, outputStream, context))
  }

  def runWithEffects(response: Request => Response, stage: Stage, fetchString: StringFromS3, lambdaIO: LambdaIO) = {

    def operation: ZuoraRestConfig => Operation = zuoraRestConfig => {
      val zuoraRequests = ZuoraRestRequestMaker(response, zuoraRestConfig)
      val zuoraQuerier = ZuoraQuery(zuoraRequests)
      IdentityRetentionSteps(zuoraQuerier)
    }

    val loadConfig = LoadConfigModule(stage, fetchString)
    ApiGatewayHandler(lambdaIO)(for {
      zuoraConfig <- loadConfig[ZuoraRestConfig].toApiGatewayOp("load zuora config")
      trustedApiConfig <- loadConfig[TrustedApiConfig].toApiGatewayOp("load trusted api config")
      configuredOp = operation(zuoraConfig)
    } yield (trustedApiConfig, configuredOp))

  }

}
