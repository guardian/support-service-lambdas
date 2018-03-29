package com.gu.util.zuora

import okhttp3.{MediaType, Request, RequestBody, Response}
import play.api.libs.json._
import scalaz.Scalaz._
import scalaz.{\/, \/-}

object RestRequestMaker extends Logging {

  case class ClientFail(message: String)

  type ClientFailableOp[A] = ClientFail \/ A
  def httpIsSuccessful(response: Response): ClientFailableOp[Unit] = {
    if (response.isSuccessful) {
      ().right
    } else {
      val body = response.body.string
      val truncated = body.take(500) + (if (body.length > 500) "..." else "")
      logger.error(s"Request to Zuora was unsuccessful, the response was: \n $response\n$truncated")
      ClientFail("Request to Zuora was unsuccessful").left
    }
  }

  def toResult[T: Reads](bodyAsJson: JsValue): ClientFailableOp[T] = {
    bodyAsJson.validate[T] match {
      case success: JsSuccess[T] =>
        success.get.right
      case error: JsError => {
        logger.error(s"Failed to convert Zuora response to case case $error. Response body was: \n $bodyAsJson")
        ClientFail("Error when converting Zuora response to case class").left
      }
    }
  }

  class Requests(headers: Map[String, String], baseUrl: String, getResponse: Request => Response, zuoraIsSuccessful: JsValue => ClientFailableOp[Unit]) {

    def get[RESP: Reads](path: String): ClientFailableOp[RESP] =
      for {
        bodyAsJson <- sendRequest(buildRequest(headers, baseUrl + path, _.get()), getResponse).map(Json.parse)
        _ <- zuoraIsSuccessful(bodyAsJson)
        respModel <- toResult[RESP](bodyAsJson)
      } yield respModel

    def put[REQ: Writes, RESP: Reads](req: REQ, path: String): ClientFailableOp[RESP] = {
      val body = createBody[REQ](req)
      for {
        bodyAsJson <- sendRequest(buildRequest(headers, baseUrl + path, _.put(body)), getResponse).map(Json.parse)
        _ <- zuoraIsSuccessful(bodyAsJson)
        respModel <- toResult[RESP](bodyAsJson)
      } yield respModel
    }

    def post[REQ: Writes, RESP: Reads](req: REQ, path: String, skipCheck: Boolean = false): ClientFailableOp[RESP] = {
      val body = createBody[REQ](req)
      for {
        bodyAsJson <- sendRequest(buildRequest(headers, baseUrl + path, _.post(body)), getResponse).map(Json.parse)
        _ <- if (skipCheck) \/-(()) else zuoraIsSuccessful(bodyAsJson)
        respModel <- toResult[RESP](bodyAsJson)
      } yield respModel
    }

    def patch[REQ: Writes](req: REQ, path: String, skipCheck: Boolean = false): ClientFailableOp[Unit] = {
      val body = createBody[REQ](req)
      for {
        _ <- sendRequest(buildRequest(headers, baseUrl + path, _.patch(body)), getResponse)
      } yield ()
    }

  }

  def sendRequest(request: Request, getResponse: Request => Response): ClientFailableOp[String] = {
    logger.info(s"Attempting to do request")
    val response = getResponse(request)
    httpIsSuccessful(response).map(_ => response.body.string)
  }

  def buildRequest(headers: Map[String, String], url: String, addMethod: Request.Builder => Request.Builder): Request = {
    val builder = headers.foldLeft(new Request.Builder())({
      case (builder, (header, value)) =>
        builder.addHeader(header, value)
    })
    val withUrl = builder.url(url)
    addMethod(withUrl).build()
  }

  private def createBody[REQ: Writes](req: REQ) = {
    RequestBody.create(MediaType.parse("application/json"), Json.toJson(req).toString)
  }

}
