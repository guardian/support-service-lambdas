package com.gu.newProductApi.addSubscription

import java.io.{InputStream, OutputStream}

import com.amazonaws.services.lambda.runtime.Context
import com.gu.effects.{GetFromS3, RawEffects}
import com.gu.util.Logging
import com.gu.util.apigateway.{ApiGatewayHandler, ApiGatewayRequest, ApiGatewayResponse}
import com.gu.util.apigateway.ApiGatewayHandler.{LambdaIO, Operation}
import com.gu.util.apigateway.ResponseModels.ApiResponse
import com.gu.util.config.{LoadConfigModule, Stage, TrustedApiConfig}
import com.gu.util.config.LoadConfigModule.StringFromS3
import com.gu.util.zuora.ZuoraRestConfig
import okhttp3.{Request, Response}
import com.gu.util.reader.Types._

object Handler extends Logging {

  // Referenced in Cloudformation
  def apply(inputStream: InputStream, outputStream: OutputStream, context: Context): Unit = {
    runWithEffects(RawEffects.response, RawEffects.stage, GetFromS3.fetchString, LambdaIO(inputStream, outputStream, context))
  }

  def addSubscriptionSteps(apiGatewayRequest: ApiGatewayRequest): ApiResponse = {
    (for {
      request <- apiGatewayRequest.bodyAsCaseClass[AddSubscriptionRequest]()
      _ = logger.info(s"parsed request as $request")
    } yield ApiGatewayResponse(body = AddedSubscription("A-S00045523"), statusCode = "200")).apiResponse
  }

  def runWithEffects(response: Request => Response, stage: Stage, fetchString: StringFromS3, lambdaIO: LambdaIO) = {

    def operation: ZuoraRestConfig => Operation = zuoraRestConfig => {
      Operation.noHealthcheck(
        steps = addSubscriptionSteps,
        shouldAuthenticate = false
      )
    }

    val loadConfig = LoadConfigModule(stage, fetchString)
    ApiGatewayHandler(lambdaIO)(for {
      zuoraConfig <- loadConfig[ZuoraRestConfig].toApiGatewayOp("load zuora config")
      trustedApiConfig <- loadConfig[TrustedApiConfig].toApiGatewayOp("load trusted api config")
      configuredOp = operation(zuoraConfig)
    } yield (trustedApiConfig, configuredOp))

  }

}
