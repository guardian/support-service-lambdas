package com.gu.util.zuora

import java.io.InputStream

import okhttp3.{MediaType, Request, RequestBody, Response}
import play.api.libs.json._
import scalaz.Scalaz._
import scalaz.{-\/, \/, \/-}

import scala.util.{Failure, Success, Try}

object RestRequestMaker extends Logging {

  sealed trait ClientFail {
    def message: String
  }
  case class NotFound(message: String) extends ClientFail
  case class GenericError(message: String) extends ClientFail

  type ClientFailableOp[A] = ClientFail \/ A
  def httpIsSuccessful(response: Response): ClientFailableOp[Unit] = {
    if (response.isSuccessful) {
      ().right
    } else {
      val body = response.body.string

      val truncated = body.take(500) + (if (body.length > 500) "..." else "")
      logger.error(s"Request to Zuora was unsuccessful, response status was ${response.code}, response body: \n $response\n$truncated")
      if (response.code == 404) {
        NotFound(response.message).left
      } else GenericError("Request to Zuora was unsuccessful").left
    }
  }

  def toResult[T: Reads](bodyAsJson: JsValue): ClientFailableOp[T] = {
    bodyAsJson.validate[T] match {
      case success: JsSuccess[T] =>
        success.get.right
      case error: JsError => {
        logger.error(s"Failed to convert Zuora response to case case $error. Response body was: \n $bodyAsJson")
        GenericError("Error when converting Zuora response to case class").left
      }
    }
  }

  case class DownloadStream(stream: InputStream, lengthBytes: Long)

  trait RequestsPUT {
    def put[REQ: Writes, RESP: Reads](req: REQ, path: String): ClientFailableOp[RESP]
  }

  sealed trait IsCheckNeeded
  case object WithCheck extends IsCheckNeeded
  case object WithoutCheck extends IsCheckNeeded
  type RequestsGet[A] = (String, IsCheckNeeded) => ClientFailableOp[A]

  class Requests(
    headers: Map[String, String],
    baseUrl: String,
    getResponse: Request => Response,
    jsonIsSuccessful: JsValue => ClientFailableOp[Unit]
  ) extends RequestsPUT {
    // this can be a class and still be cohesive because every single method in the class needs every single value.  so we are effectively partially
    // applying everything with these params

    def get[RESP: Reads](path: String, skipCheck: IsCheckNeeded = WithCheck): ClientFailableOp[RESP] =
      for {
        bodyAsJson <- sendRequest(buildRequest(headers, baseUrl + path, _.get()), getResponse).map(Json.parse)
        _ <- if (skipCheck == WithCheck) \/-(()) else jsonIsSuccessful(bodyAsJson)
        respModel <- toResult[RESP](bodyAsJson)
      } yield respModel

    def put[REQ: Writes, RESP: Reads](req: REQ, path: String): ClientFailableOp[RESP] = {
      val body = createBody[REQ](req)
      for {
        bodyAsJson <- sendRequest(buildRequest(headers, baseUrl + path, _.put(body)), getResponse).map(Json.parse)
        _ <- jsonIsSuccessful(bodyAsJson)
        respModel <- toResult[RESP](bodyAsJson)
      } yield respModel
    }

    def post[REQ: Writes, RESP: Reads](req: REQ, path: String, skipCheck: Boolean = false): ClientFailableOp[RESP] = {
      val body = createBody[REQ](req)
      for {
        bodyAsJson <- sendRequest(buildRequest(headers, baseUrl + path, _.post(body)), getResponse).map(Json.parse)
        _ <- if (skipCheck) \/-(()) else jsonIsSuccessful(bodyAsJson)
        respModel <- toResult[RESP](bodyAsJson)
      } yield respModel
    }

    def patch[REQ: Writes](req: REQ, path: String, skipCheck: Boolean = false): ClientFailableOp[Unit] = {
      val body = createBody[REQ](req)
      for {
        _ <- sendRequest(buildRequest(headers, baseUrl + path, _.patch(body)), getResponse)
      } yield ()
    }

    private def extractContentLength(response: Response) = {
      Try(response.header("content-length").toLong) match {
        case Success(contentlength) => \/-(contentlength)
        case Failure(error) => -\/(GenericError(s"could not extract content length from response ${error.getMessage}"))
      }
    }

    def getDownloadStream(path: String): ClientFailableOp[DownloadStream] = {
      val request = buildRequest(headers, baseUrl + path, _.get())
      val response = getResponse(request)
      for {
        _ <- httpIsSuccessful(response)
        contentlength <- extractContentLength(response)
      } yield DownloadStream(response.body.byteStream, contentlength)
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
