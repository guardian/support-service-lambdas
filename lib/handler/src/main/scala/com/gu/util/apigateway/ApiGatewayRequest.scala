package com.gu.util.apigateway

import com.gu.util.apigateway.ResponseModels.ApiResponse
import com.gu.util.reader.Types._
import ApiGatewayOp._
import play.api.libs.json._

import scala.util.{Failure, Success, Try}

/* Using query strings because for Basic Auth to work Zuora requires us to return a WWW-Authenticate
  header, and API Gateway does not support this header (returns x-amzn-Remapped-WWW-Authenticate instead)
  */
case class ApiGatewayRequest(
  queryStringParameters: Option[Map[String, String]],
  body: Option[String],
  headers: Option[Map[String, String]],
  pathParameters: Option[JsValue] = None
) {

  def queryParamsAsCaseClass[A](failureResponse: ApiResponse = ApiGatewayResponse.badRequest)(implicit reads: Reads[A]): ApiGatewayOp[A] = {
    val paramsMap = queryStringParameters.getOrElse(Map.empty)
    val paramsJson = Json.toJson(paramsMap)
    Json.fromJson[A](paramsJson).toApiGatewayOp(failureResponse)
  }

  def bodyAsCaseClass[A](failureResponse: ApiResponse = ApiGatewayResponse.badRequest)(implicit reads: Reads[A]): ApiGatewayOp[A] = {
    body match {
      case Some(requestBody) =>
        Try(Json.parse(requestBody)) match {
          case Success(js) =>
            Json.fromJson[A](js).toApiGatewayOp(failureResponse)
          case Failure(ex) =>
            logger.warn(s"Tried to parse JSON but it was invalid")
            ReturnWithResponse(failureResponse)
        }
      case None =>
        logger.warn(s"Attempted to access response body but there was none")
        None.toApiGatewayContinueProcessing(ApiGatewayResponse.internalServerError("attempted to parse body when handling a GET request"))
    }
  }

  def pathParamsAsCaseClass[T](failureResponse: ApiResponse = ApiGatewayResponse.badRequest)(implicit reads: Reads[T]): ApiGatewayOp[T] =
    pathParameters match {
      case Some(pathParamsJSON) => Json.fromJson[T](pathParamsJSON).toApiGatewayOp(failureResponse)
      case None => ReturnWithResponse(failureResponse)
    }

}

object ApiGatewayRequest {
  implicit val jf = Json.reads[ApiGatewayRequest]
}
