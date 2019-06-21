package com.gu.util.apigateway

import java.io.{OutputStream, OutputStreamWriter}

import com.gu.util.Logging
import com.gu.util.apigateway.ResponseModels.{ApiResponse, Headers}
import com.gu.util.apigateway.ResponseWriters._
import play.api.libs.json.Json.JsValueWrapper
import play.api.libs.json.{Json, Writes}

object ResponseModels {

  sealed abstract class CacheHeader(val keyValues: List[(String, JsValueWrapper)])
  case object CacheDefault extends CacheHeader(List.empty)
  case object CacheNoCache extends CacheHeader(List(
    // this forces revalidation, but doesn't prevent storing. Use Private & NoStore
    "Cache-control" -> "no-store"
  ))
  case class Headers(contentType: Option[String] = Some("application/json"), cache: CacheHeader = CacheDefault)

  case class ApiResponse(statusCode: String, body: Option[String], headers: Headers)
  object ApiResponse {
    def apply(statusCode: String, body: String, headers: Headers = new Headers): ApiResponse = new ApiResponse(statusCode, Some(body), headers)
  }

}

object ResponseWriters {

  implicit val headersWrites = new Writes[Headers] {
    def writes(headers: Headers) = {
      val keyValues = headers.contentType.map(contentType =>
        "Content-Type" -> (contentType: JsValueWrapper)).toList ++ headers.cache.keyValues
      Json.obj(keyValues: _*)
    }
  }

  implicit val responseWrites = new Writes[ApiResponse] {
    def writes(response: ApiResponse) = Json.obj(
      "statusCode" -> response.statusCode,
      "headers" -> response.headers,
      "body" -> response.body
    )
  }

}

object ApiGatewayResponse extends Logging {

  def outputForAPIGateway(outputStream: OutputStream, response: ApiResponse): Unit = {
    val writer = new OutputStreamWriter(outputStream, "UTF-8")
    val jsonResponse = Json.toJson(response)
    logger.info(s"Response will be: \n ${jsonResponse.toString}")
    writer.write(Json.stringify(jsonResponse))
    writer.close()
  }

  case class ResponseBody(message: String)

  implicit val responseBodyWrites = Json.writes[ResponseBody]

  def toJsonBody(responseBody: ResponseBody) = Json.prettyPrint(Json.toJson(responseBody))

  def apply[B](statusCode: String, body: B)(implicit writes: Writes[B]) = {
    val bodyTxt = Json.prettyPrint(Json.toJson(body))
    ApiResponse(statusCode, bodyTxt)
  }

  val successfulExecution = messageResponse(
    "200",
    "Success"
  )

  def noActionRequired(reason: String) = messageResponse(
    "200",
    s"Processing is not required: $reason"
  )

  def badRequest(reason: String) = messageResponse(
    "400",
    s"Bad request: $reason"
  )

  val unauthorized = messageResponse(
    "401",
    "Credentials are missing or invalid"
  )

  val paymentRequired = messageResponse(
    "402",
    "Payment was declined"
  )

  def forbidden(message: String) = messageResponse(
    "403",
    message
  )

  def notFound(message: String) = messageResponse(
    "404",
    message
  )

  def internalServerError(error: String) = {
    logger.error(s"Processing failed due to $error")
    messageResponse(
      "500",
      "Internal server error"
    )
  }

  def messageResponse(statusCode: String, message: String) = {
    ApiResponse(
      statusCode,
      toJsonBody(ResponseBody(message))
    )
  }

}
