package com.gu.util.apigateway

import java.io.{OutputStream, OutputStreamWriter}

import com.gu.util.Logging
import com.gu.util.apigateway.ResponseModels.{ApiResponse, Headers}
import com.gu.util.apigateway.ResponseWriters._
import play.api.libs.json.{Json, Writes}

object ResponseModels {

  case class Headers(contentType: String = "application/json")

  case class ApiResponse(statusCode: String, headers: Headers, body: String)

}

object ResponseWriters {

  implicit val headersWrites = new Writes[Headers] {
    def writes(headers: Headers) = Json.obj(
      "Content-Type" -> headers.contentType
    )
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

  val successfulExecution = ApiResponse("200", new Headers, "Success")
  def noActionRequired(reason: String) = ApiResponse("200", new Headers, s"Processing is not required: $reason")

  val unauthorized = ApiResponse("401", new Headers, "Credentials are missing or invalid")
  def notFound(message: String) = ApiResponse("404", new Headers, message)
  def badRequestWithBody(body: String) = ApiResponse("400", new Headers, body)
  val badRequest = badRequestWithBody("Failure to parse JSON successfully")
  def internalServerError(error: String) = ApiResponse("500", new Headers, s"Failed to process event due to the following error: $error")

}
