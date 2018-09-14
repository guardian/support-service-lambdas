package com.gu.util.resthttp

import java.io.InputStream

import com.gu.util.resthttp.Types._
import okhttp3.{MediaType, Request, RequestBody, Response}
import play.api.libs.json._

import scala.util.{Failure, Success, Try}

object RestRequestMaker extends Logging {

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
        GenericError(s"Error when converting Zuora response to case class: $error")
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
  type RequestsPost[IN, OUT] = (IN, String, IsCheckNeeded) => ClientFailableOp[OUT]

  case class RelativePath(value: String) extends AnyVal

  case class PutRequest(body: JsValue, path: RelativePath)
  object PutRequest {
    def apply[REQ: Writes](body: REQ, path: RelativePath): PutRequest = new PutRequest(Json.toJson(body), path)
  }

  case class PatchRequest(body: JsValue, path: RelativePath)
  object PatchRequest {
    def apply[REQ: Writes](body: REQ, path: RelativePath): PatchRequest = new PatchRequest(Json.toJson(body), path)
  }

  case class GetRequest(path: RelativePath)

  case class JsonResponse(bodyAsJson: JsValue) {
    def value[RESP: Reads] = toResult[RESP](bodyAsJson)
  }

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
        _ <- if (skipCheck == WithoutCheck) ClientSuccess(()) else jsonIsSuccessful(bodyAsJson)
        respModel <- toResult[RESP](bodyAsJson)
      } yield respModel

    def put[RESP](putRequest: PutRequest): ClientFailableOp[JsonResponse] = {
      val body = createBodyFromJs(putRequest.body)
      for {
        bodyAsJson <- sendRequest(buildRequest(headers, baseUrl + putRequest.path.value, _.put(body)), getResponse).map(Json.parse)
        _ <- jsonIsSuccessful(bodyAsJson)
      } yield JsonResponse(bodyAsJson)
    }

    def put[REQ: Writes, RESP: Reads](req: REQ, path: String): ClientFailableOp[RESP] = {
      val body = createBody[REQ](req)
      for {
        bodyAsJson <- sendRequest(buildRequest(headers, baseUrl + path, _.put(body)), getResponse).map(Json.parse)
        _ <- jsonIsSuccessful(bodyAsJson)
        respModel <- toResult[RESP](bodyAsJson)
      } yield respModel
    }

    def post[REQ: Writes, RESP: Reads](req: REQ, path: String, skipCheck: IsCheckNeeded = WithCheck): ClientFailableOp[RESP] = {
      val body = createBody[REQ](req)
      for {
        bodyAsJson <- sendRequest(buildRequest(headers, baseUrl + path, _.post(body)), getResponse).map(Json.parse)
        _ <- if (skipCheck == WithoutCheck) ClientSuccess(()) else jsonIsSuccessful(bodyAsJson)
        respModel <- toResult[RESP](bodyAsJson)
      } yield respModel
    }

    def patch(patchRequest: PatchRequest): ClientFailableOp[Unit] = {
      val body = createBodyFromJs(patchRequest.body)
      for {
        _ <- sendRequest(buildRequest(headers, baseUrl + patchRequest.path.value, _.patch(body)), getResponse)
      } yield ()
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
    filterIfSuccessful(response).map(_.body.string)
  }

  def filterIfSuccessful(response: Response): ClientFailableOp[Response] = {
    httpIsSuccessful(response).map(_ => response)
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
    createBodyFromJs(Json.toJson(req))
  }

  case class BodyAsString(value: String) extends AnyVal

  def createBodyFromJs(req: JsValue) = {
    val bodyAsString = BodyAsString(Json.stringify(req))
    createBodyFromString(bodyAsString)
  }

  def createBodyFromString(bodyAsString: BodyAsString): RequestBody = {
    RequestBody.create(MediaType.parse("application/json"), bodyAsString.value)
  }
}
