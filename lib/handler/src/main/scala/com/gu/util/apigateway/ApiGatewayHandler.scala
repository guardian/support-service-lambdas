package com.gu.util.apigateway

import java.io.{InputStream, OutputStream}

import com.amazonaws.services.lambda.runtime.Context
import com.gu.util.Logging
import com.gu.util.apigateway.ApiGatewayHandlerParams.UrlParamsWire
import com.gu.util.apigateway.ApiGatewayResponse.outputForAPIGateway
import com.gu.util.apigateway.ResponseModels.ApiResponse
import com.gu.util.reader.Types._
import play.api.libs.json.Json

import scala.io.Source
import scala.util.Try

case class ApiGatewayHandlerParams(isHealthcheck: Boolean)

object ApiGatewayHandlerParams {
  case class UrlParamsWire(isHealthcheck: Option[String]) {
    def toApiHandlerParams = ApiGatewayHandlerParams(isHealthcheck.contains("true"))
  }
  implicit val wireReads = Json.reads[UrlParamsWire]
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

  case class Operation(
    steps: ApiGatewayRequest => ApiResponse,
    healthcheck: () => ApiResponse
  ) {
    def prependValidationStep(validate: ApiGatewayRequest => ApiGatewayOp[Unit]): Operation = {
      def newSteps(request: ApiGatewayRequest): ApiResponse =
        (for {
          _ <- validate(request)
          result = steps(request)
        } yield result).apiResponse
      Operation(newSteps, healthcheck)
    }

  }

  object Operation {
    def noHealthcheck(steps: ApiGatewayRequest => ApiResponse) =
      Operation(steps, () => ApiGatewayResponse.successfulExecution)
  }

  def apply(lambdaIO: LambdaIO)(fConfigOp: ApiGatewayOp[Operation]): Unit = {

    import lambdaIO._

    val response =
      for {
        operation <- fConfigOp
        apiGatewayRequest <- parseApiGatewayRequest(inputStream)
        queryParams <- apiGatewayRequest.queryParamsAsCaseClass[UrlParamsWire]().map(_.toApiHandlerParams)
      } yield {
        if (queryParams.isHealthcheck)
          operation.healthcheck().withLogging("healthcheck")
        else
          operation.steps(apiGatewayRequest).withLogging("steps")
      }

    outputForAPIGateway(outputStream, response.apiResponse)
  }
}
