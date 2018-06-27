package com.gu.util.apigateway

import java.io.{InputStream, OutputStream}

import com.amazonaws.services.lambda.runtime.Context
import com.gu.util.Logging
import com.gu.util.apigateway.ApiGatewayResponse.{outputForAPIGateway, unauthorized}
import com.gu.util.apigateway.Auth.{RequestAuth, credentialsAreValid}
import com.gu.util.apigateway.ResponseModels.ApiResponse
import com.gu.util.config.{Config, TrustedApiConfig}
import com.gu.util.reader.Types.ApiGatewayOp._
import com.gu.util.reader.Types._
import play.api.libs.json.{JsPath, Json}
import play.api.libs.functional.syntax._

import scala.io.Source
import scala.util.Try

case class ApiGatewayHandlerParams(apiToken: Option[String], isHealthcheck: Boolean)
object ApiGatewayHandlerParams {
  implicit val reads = (
    (JsPath \ "apiToken").readNullable[String] and
    (JsPath \ "isHealthcheck").readNullable[String].map(_.contains("true"))
  )(ApiGatewayHandlerParams.apply _)
}

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

  def isAuthorised(
    shouldAuthenticate: Boolean,
    requestAuth: Option[RequestAuth],
    trustedApiConfig: TrustedApiConfig
  ): Boolean = {
    !shouldAuthenticate || credentialsAreValid(requestAuth, trustedApiConfig)

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
      queryParams <- apiGatewayRequest.queryParamsAsCaseClass[ApiGatewayHandlerParams]()
      response <- if (queryParams.isHealthcheck)
        ContinueProcessing(operation.healthcheck()).withLogging("healthcheck")
      else
        for {
          _ <- isAuthorised(operation.shouldAuthenticate, queryParams.apiToken.map(RequestAuth(_)), config.trustedApiConfig)
            .toApiGatewayContinueProcessing(unauthorized).withLogging("authentication")
        } yield operation.steps(apiGatewayRequest).withLogging("steps")
    } yield response

    outputForAPIGateway(outputStream, response.apiResponse)

  }

}

