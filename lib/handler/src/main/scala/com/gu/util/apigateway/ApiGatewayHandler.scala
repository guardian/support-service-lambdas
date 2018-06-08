package com.gu.util.apigateway

import java.io.{InputStream, OutputStream}

import com.amazonaws.services.lambda.runtime.Context
import com.gu.util.Logging
import com.gu.util.apigateway.ApiGatewayResponse.{outputForAPIGateway, unauthorized}
import com.gu.util.apigateway.Auth.credentialsAreValid
import com.gu.util.apigateway.ResponseModels.ApiResponse
import com.gu.util.config.{Config, TrustedApiConfig}
import com.gu.util.reader.Types.ApiGatewayOp._
import com.gu.util.reader.Types._
import play.api.libs.json.Json

import scala.io.Source
import scala.util.Try

object ApiGatewayHandler extends Logging {

  case class LambdaIO(inputStream: InputStream, outputStream: OutputStream, context: Context)

  def parseApiGatewayRequest(inputStream: InputStream): ApiGatewayOp[ApiGatewayRequest] = {
    for {

      jsonString <- inputFromApiGateway(inputStream)
        .toApiGatewayOp("get json data from API gateway").withLogging("payload from api gateway")
      apiGatewayRequest <- Json.parse(jsonString).validate[ApiGatewayRequest]
        .toApiGatewayOp().withLogging("parsed api gateway object")

    } yield apiGatewayRequest
  }

  private def inputFromApiGateway(inputStream: InputStream) = {
    Try {
      Source.fromInputStream(inputStream).mkString
    }
  }

  def authenticateCallout(
    shouldAuthenticate: Boolean,
    requestAuth: Option[RequestAuth],
    trustedApiConfig: TrustedApiConfig
  ): ApiGatewayOp[Unit] = {
    if (!shouldAuthenticate || credentialsAreValid(requestAuth, trustedApiConfig)) ContinueProcessing(()) else ReturnWithResponse(unauthorized)
  }

  case class Operation(
    steps: ApiGatewayRequest => ApiResponse,
    healthcheck: () => ApiResponse,
    shouldAuthenticate: Boolean = true
  )
  object Operation {
    def noHealthcheck(steps: ApiGatewayRequest => ApiResponse, shouldAuthenticate: Boolean = true) =
      Operation(steps, () => ApiGatewayResponse.successfulExecution, shouldAuthenticate)
  }

  def apply[StepsConfig](
    lambdaIO: LambdaIO
  )(
    fConfigOp: ApiGatewayOp[(Config[StepsConfig], Operation)]
  ): Unit = {

    import lambdaIO._

    val response = for {
      configOp <- fConfigOp
      (config, operation) = configOp
      apiGatewayRequest <- parseApiGatewayRequest(inputStream)
      response <- if (apiGatewayRequest.queryStringParameters.exists(_.isHealthcheck))
        ContinueProcessing(operation.healthcheck()).withLogging("healthcheck")
      else
        for {
          _ <- authenticateCallout(operation.shouldAuthenticate, apiGatewayRequest.requestAuth, config.trustedApiConfig)
            .withLogging("authentication")
        } yield operation.steps(apiGatewayRequest).withLogging("steps")
    } yield response

    outputForAPIGateway(outputStream, response.apiResponse)

  }

}

