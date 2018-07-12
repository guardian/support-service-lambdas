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
import play.api.libs.json.Json

object Handler extends Logging {

  // Referenced in Cloudformation
  def apply(inputStream: InputStream, outputStream: OutputStream, context: Context): Unit = {
    runWithEffects(RawEffects.response, RawEffects.stage, GetFromS3.fetchString, LambdaIO(inputStream, outputStream, context))
  }

  //todo make this generic and move it somewhere
  def apiResponse(body: AddSubscriptionResponse, status: String) = {
    val bodyTxt = Json.prettyPrint(Json.toJson(body))
    ApiResponse(status, bodyTxt)
  }

  def addSubscriptionSteps(apiGatewayRequest: ApiGatewayRequest): ApiResponse = {
    (for {
      request <- apiGatewayRequest.bodyAsCaseClass[AddSubscriptionRequest]()
      _ = logger.info(s"parsed request as $request")
      resp = apiResponse(body = AddedSubscription("A-S00045523"), status = "200")
    } yield resp).apiResponse

  }

  def runWithEffects(response: Request => Response, stage: Stage, fetchString: StringFromS3, lambdaIO: LambdaIO) = {

    def operation: ZuoraRestConfig => Operation = zuoraRestConfig => {
      //  val zuoraRequests = ZuoraRestRequestMaker(response, zuoraRestConfig)
      // val zuoraQuerier = ZuoraQuery(zuoraRequests)
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
