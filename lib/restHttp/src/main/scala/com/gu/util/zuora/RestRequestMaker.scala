package com.gu.util.zuora

import java.io.InputStream

import okhttp3.{MediaType, Request, RequestBody, Response}
import play.api.libs.json._
import scalaz.{-\/, Monad, \/, \/-}

import scala.util.{Failure, Success, Try}

object RestRequestMaker extends Logging {

  import Types._

  sealed trait ClientFail extends ClientFailableOp[Nothing] {
    override def toDisjunction: ClientFail \/ Nothing = -\/(this)

    val isFail = true

    def message: String
  }

  case class NotFound(message: String) extends ClientFail

  case class GenericError(message: String) extends ClientFail

  case class ClientSuccess[A](value: A) extends ClientFailableOp[A] {
    val isFail = false
    override def toDisjunction: ClientFail \/ A = \/-(value)
  }

  sealed trait ClientFailableOp[+A] {

    def isFail: Boolean

    def toDisjunction: scalaz.\/[ClientFail, A]

    def flatMap[B](f: A => ClientFailableOp[B]): ClientFailableOp[B] =
      toDisjunction.flatMap(f.andThen(_.toDisjunction)).toClientFailableOp

    def map[B](f: A => B): ClientFailableOp[B] =
      toDisjunction.map(f).toClientFailableOp

    def mapFailure(f: ClientFail => ClientFail): ClientFailableOp[A] =
      toDisjunction.leftMap(f).toClientFailableOp

  }

  object Types {

    implicit class UnderlyingOps[A](theEither: scalaz.\/[ClientFail, A]) {

      def toClientFailableOp: ClientFailableOp[A] =
        theEither match {
          case scalaz.\/-(success) => ClientSuccess(success)
          case scalaz.-\/(finished) => finished
        }

    }

    implicit val clientFailableOpM: Monad[ClientFailableOp] = {

      type ClientDisjunction[A] = scalaz.\/[ClientFail, A]

      val disjunctionMonad = implicitly[Monad[ClientDisjunction]]

      new Monad[ClientFailableOp] {

        override def bind[A, B](fa: ClientFailableOp[A])(f: A => ClientFailableOp[B]): ClientFailableOp[B] = {

          val originalAsDisjunction: ClientDisjunction[A] =
            fa.toDisjunction

          val functionWithResultAsDisjunction: A => ClientDisjunction[B] =
            f.andThen(_.toDisjunction)

          val boundAsDisjunction: ClientDisjunction[B] =
            disjunctionMonad.bind(originalAsDisjunction)(functionWithResultAsDisjunction)

          boundAsDisjunction.toClientFailableOp
        }

        override def point[A](a: => A): ClientFailableOp[A] = ClientSuccess(a)

      }
    }

  }

  def httpIsSuccessful(response: Response): ClientFailableOp[Unit] = {
    if (response.isSuccessful) {
      ClientSuccess(())
    } else {
      val body = response.body.string

      val truncated = body.take(500) + (if (body.length > 500) "..." else "")
      logger.error(s"Request to Zuora was unsuccessful, response status was ${response.code}, response body: \n $response\n$truncated")
      if (response.code == 404) {
        NotFound(response.message)
      } else GenericError("Request to Zuora was unsuccessful")
    }
  }

  def toResult[T: Reads](bodyAsJson: JsValue): ClientFailableOp[T] = {
    bodyAsJson.validate[T] match {
      case success: JsSuccess[T] =>
        ClientSuccess(success.get)
      case error: JsError => {
        logger.error(s"Failed to convert Zuora response to case case $error. Response body was: \n $bodyAsJson")
        GenericError("Error when converting Zuora response to case class")
      }
    }
  }

  case class DownloadStream(stream: InputStream, lengthBytes: Long)

  trait RequestsPUT {
    def put[REQ: Writes, RESP: Reads](req: REQ, path: String): ClientFailableOp[RESP]
  }

  class Requests(
    headers: Map[String, String],
    baseUrl: String,
    getResponse: Request => Response,
    jsonIsSuccessful: JsValue => ClientFailableOp[Unit]
  ) extends RequestsPUT {
    // this can be a class and still be cohesive because every single method in the class needs every single value.  so we are effectively partially
    // applying everything with these params

    def get[RESP: Reads](path: String): ClientFailableOp[RESP] =
      for {
        bodyAsJson <- sendRequest(buildRequest(headers, baseUrl + path, _.get()), getResponse).map(Json.parse)
        _ <- jsonIsSuccessful(bodyAsJson)
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
        _ <- if (skipCheck) ClientSuccess(()) else jsonIsSuccessful(bodyAsJson)
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
        case Success(contentlength) => ClientSuccess(contentlength)
        case Failure(error) => GenericError(s"could not extract content length from response ${error.getMessage}")
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
