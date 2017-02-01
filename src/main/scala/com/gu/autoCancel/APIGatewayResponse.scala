package com.gu.autoCancel

import com.gu.autoCancel.ResponseWriters._
import java.io.{ OutputStream, OutputStreamWriter }
import com.gu.autoCancel.ResponseModels.{ Headers, Response }
import play.api.libs.json.{ Json, Writes }

object ResponseModels {

  case class Headers(contentType: String = "application/json")

  case class Response(statusCode: String, headers: Headers, body: String)

}

object ResponseWriters {

  implicit val headersWrites = new Writes[Headers] {
    def writes(headers: Headers) = Json.obj(
      "Content-Type" -> headers.contentType
    )
  }

  implicit val responseWrites = new Writes[Response] {
    def writes(response: Response) = Json.obj(
      "statusCode" -> response.statusCode,
      "headers" -> response.headers,
      "body" -> response.body
    )
  }

}

object APIGatewayResponse extends Logging {

  def outputForAPIGateway(outputStream: OutputStream, response: Response): Unit = {
    val writer = new OutputStreamWriter(outputStream, "UTF-8")
    val jsonResponse = Json.toJson(response)
    logger.info(s"Response will be: \n ${jsonResponse.toString}")
    writer.write(Json.stringify(jsonResponse))
    writer.close()
  }

  val apiGatewaySuccessResponse = Response("200", new Headers, "Success")

  def apiGatewayFailureResponse(e: String) = Response("500", new Headers, s"Failed to process auto-cancellation with the following error: $e")

}
