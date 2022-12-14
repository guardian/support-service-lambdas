package com.gu.util.apigateway

import com.gu.util.apigateway.ResponseModels.ApiResponse
import com.gu.util.reader.Types._
import ApiGatewayOp._
import com.typesafe.scalalogging.LazyLogging
import play.api.libs.json._

import scala.util.{Failure, Success, Try}

/* Using query strings because for Basic Auth to work Zuora requires us to return a WWW-Authenticate
  header, and API Gateway does not support this header (returns x-amzn-Remapped-WWW-Authenticate instead)
 */
case class ApiGatewayRequest(
    httpMethod: Option[String],
    queryStringParameters: Option[Map[String, String]],
    body: Option[String],
    headers: Option[Map[String, String]],
    pathParameters: Option[JsValue] = None,
    path: Option[String],
) extends LazyLogging {

  def queryParamsAsCaseClass[A]()(implicit reads: Reads[A]): ApiGatewayOp[A] = {
    val paramsMap = queryStringParameters.getOrElse(Map.empty)
    val paramsJson = Json.toJson(paramsMap)
    Json.fromJson[A](paramsJson).toApiGatewayOp("query parameters", None)
  }

  implicit class TryOps[A](theTry: Try[A]) {

    def toApiGatewayOp(action: Option[ApiResponse]): ApiGatewayOp[A] = {
      theTry match {
        case Success(success) => ContinueProcessing(success)
        case Failure(error) =>
          ReturnWithResponse(
            action.getOrElse(ApiGatewayResponse.badRequest(s"request body couldn't be parsed: $error")),
          )
      }
    }

  }

  implicit class JsResultOps[A](jsResult: JsResult[A]) {

    def toApiGatewayOp(field: String, response: Option[ApiResponse]): ApiGatewayOp[A] = {
      jsResult match {
        case JsSuccess(value, _) => ContinueProcessing(value)
        case JsError(error) =>
          ReturnWithResponse(response.getOrElse(ApiGatewayResponse.badRequest(s"$field couldn't be parsed: $error")))
      }
    }
  }

  def bodyAsCaseClass[A](failureResponse: Option[ApiResponse] = None)(implicit reads: Reads[A]): ApiGatewayOp[A] = {
    body match {
      case Some(requestBody) =>
        for {
          js <- Try(Json.parse(requestBody)).toApiGatewayOp(failureResponse)
          obj <- Json.fromJson[A](js).toApiGatewayOp("request body", failureResponse)
        } yield obj
      case None =>
        logger.warn(s"Attempted to access response body but there was none")
        None.toApiGatewayContinueProcessing(
          ApiGatewayResponse.internalServerError("attempted to parse body when handling a GET request"),
        )
    }
  }

  def pathParamsAsCaseClass[T]()(implicit reads: Reads[T]): ApiGatewayOp[T] =
    pathParameters match {
      case Some(pathParamsJSON) => Json.fromJson[T](pathParamsJSON).toApiGatewayOp("path parameters", None)
      case None => ReturnWithResponse(ApiGatewayResponse.badRequest("no path parameters"))
    }

}

object ApiGatewayRequest {
  implicit val jf = Json.reads[ApiGatewayRequest]
}
