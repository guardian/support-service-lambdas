package com.gu.autoCancel

import com.gu.autoCancel.ResponseWriters._
import java.io.{ OutputStream, OutputStreamWriter }
import com.gu.autoCancel.ResponseModels.{ Headers, AutoCancelResponse }
import play.api.libs.json.{ Json, Writes }

object ResponseModels {

  case class Headers(contentType: String = "application/json")

  case class AutoCancelResponse(statusCode: String, headers: Headers, body: String)

}

object ResponseWriters {

  implicit val headersWrites = new Writes[Headers] {
    def writes(headers: Headers) = Json.obj(
      "Content-Type" -> headers.contentType
    )
  }

  implicit val responseWrites = new Writes[AutoCancelResponse] {
    def writes(response: AutoCancelResponse) = Json.obj(
      "statusCode" -> response.statusCode,
      "headers" -> response.headers,
      "body" -> response.body
    )
  }

}

object APIGatewayResponse extends Logging {

  def outputForAPIGateway(outputStream: OutputStream, response: AutoCancelResponse): Unit = {
    val writer = new OutputStreamWriter(outputStream, "UTF-8")
    val jsonResponse = Json.toJson(response)
    logger.info(s"Response will be: \n ${jsonResponse.toString}")
    writer.write(Json.stringify(jsonResponse))
    writer.close()
  }

  val success = AutoCancelResponse("200", new Headers, "Success")
  val unauthorized = AutoCancelResponse("401", new Headers, "Credentials are missing or invalid")
  val badRequest = AutoCancelResponse("400", new Headers, "Failure to parse XML successfully")
  def forbidden(reason: String) = AutoCancelResponse("403", new Headers, s"Refused to process auto-cancellation: $reason")
  def internalServerError(error: String) = AutoCancelResponse("500", new Headers, s"Failed to process auto-cancellation with the following error: $error")

}