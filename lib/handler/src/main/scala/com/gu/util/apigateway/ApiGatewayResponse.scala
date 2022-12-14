package com.gu.util.apigateway

import java.io.{OutputStream, OutputStreamWriter}

import com.gu.util.Logging
import com.gu.util.apigateway.ResponseModels.{ApiResponse, Headers}
import com.gu.util.apigateway.ResponseWriters._
import play.api.libs.json.{Json, Writes}

object ResponseModels {

  case class Headers(contentType: String = "application/json")

  case class ApiResponse(statusCode: String, body: String, headers: Headers = new Headers)

}

object ResponseWriters {

  implicit val headersWrites = new Writes[Headers] {
    def writes(headers: Headers) = Json.obj(
      "Content-Type" -> headers.contentType,
    )
  }

  implicit val responseWrites = new Writes[ApiResponse] {
    def writes(response: ApiResponse) = Json.obj(
      "statusCode" -> response.statusCode,
      "headers" -> response.headers,
      "body" -> response.body,
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
    "Success",
  )

  def noActionRequired(reason: String) = messageResponse(
    "200",
    s"Processing is not required: $reason",
  )

  def badRequest(reason: String) = messageResponse(
    "400",
    s"Bad request: $reason",
  )

  val unauthorized = messageResponse(
    "401",
    "Credentials are missing or invalid",
  )

  val paymentRequired = messageResponse(
    "402",
    "Payment was declined",
  )

  def forbidden(message: String) = messageResponse(
    "403",
    message,
  )

  def notFound(message: String) = messageResponse(
    "404",
    message,
  )

  def internalServerError(error: String) = {
    logger.error(s"Processing failed due to $error")
    messageResponse(
      "500",
      "Internal server error",
    )
  }

  def messageResponse(statusCode: String, message: String) = {
    ApiResponse(
      statusCode,
      toJsonBody(ResponseBody(message)),
    )
  }

}
