package com.gu.util.resthttp

import java.io.InputStream

import com.gu.util.resthttp.Types._
import com.typesafe.scalalogging.LazyLogging
import okhttp3.{MediaType, Request, RequestBody, Response}
import play.api.libs.json._

import scala.util.{Failure, Success, Try}

object RestRequestMaker extends LazyLogging {

  val genericError = GenericError("HTTP request was unsuccessful")

  def httpIsSuccessful(
      response: Response,
      maybeErrorBodyParser: Option[String => ClientFailure] = None,
  ): ClientFailableOp[Unit] = {
    if (response.isSuccessful) {
      ClientSuccess(())
    } else {
      val body = response.body.string

      val truncated = body.take(500) + (if (body.length > 500) "..." else "")
      logger.error(
        s"HTTP request was unsuccessful, response status was ${response.code}, response body: \n $response\n$truncated",
      )
      maybeErrorBodyParser match {
        case Some(errorBodyParser) => errorBodyParser(body)
        case _ if (response.code == 404) => NotFound(response.message)
        case _ => genericError
      }
    }
  }

  def toResult[T: Reads](bodyAsJson: JsValue): ClientFailableOp[T] = {
    bodyAsJson.validate[T] match {
      case success: JsSuccess[T] =>
        ClientSuccess(success.get)
      case error: JsError => {
        logger.error(s"Failed to convert JSON response to case class $error. Response body was: \n $bodyAsJson")
        GenericError(s"Error when converting JSON response to case class: $error")
      }
    }
  }

  case class DownloadStream(stream: InputStream, lengthBytes: Long)

  trait RequestsPUT {
    def put[REQ: Writes, RESP: Reads](req: REQ, path: String): ClientFailableOp[RESP]
    def put[REQ: Writes, RESP: Reads](
        req: REQ,
        path: String,
        apiVersionHeader: (String, String),
    ): ClientFailableOp[RESP]
  }

  sealed trait IsCheckNeeded
  case object WithCheck extends IsCheckNeeded
  case object WithoutCheck extends IsCheckNeeded
  type RequestsGet[A] = (String, IsCheckNeeded) => ClientFailableOp[A]
  type RequestsPost[IN, OUT] = (IN, String, IsCheckNeeded) => ClientFailableOp[OUT]

  case class RelativePath(value: String) extends AnyVal

  case class Header(name: String, value: String)

  case class PutRequest(body: JsValue, path: RelativePath)
  object PutRequest {
    def apply[REQ: Writes](body: REQ, path: RelativePath): PutRequest = new PutRequest(Json.toJson(body), path)
  }

  case class PatchRequest(body: JsValue, path: RelativePath)
  object PatchRequest {
    def apply[REQ: Writes](body: REQ, path: RelativePath): PatchRequest = new PatchRequest(Json.toJson(body), path)
  }

  case class PostRequest(body: JsValue, path: RelativePath)

  object PostRequest {
    def apply[REQ: Writes](body: REQ, path: RelativePath): PostRequest = new PostRequest(Json.toJson(body), path)
  }

  case class PostRequestWithHeaders(body: JsValue, path: RelativePath, headers: List[Header])

  object PostRequestWithHeaders {
    def apply[REQ: Writes](body: REQ, path: RelativePath, headers: List[Header] = List.empty): PostRequestWithHeaders =
      new PostRequestWithHeaders(Json.toJson(body), path, headers)
  }

  case class GetRequest(path: RelativePath)

  case class GetRequestWithParams(path: RelativePath, urlParams: UrlParams)

  case class DeleteRequest(path: RelativePath)

  case class JsonResponse(bodyAsJson: JsValue) {
    def value[RESP: Reads] = toResult[RESP](bodyAsJson)
  }

  case class UrlParams(value: Map[String, String])
  object UrlParams {
    val empty = UrlParams(Map.empty)
  }

  class Requests(
      headers: Map[String, String],
      baseUrl: String,
      getResponse: Request => Response,
      jsonIsSuccessful: JsValue => ClientFailableOp[Unit],
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
        bodyAsJson <- sendRequest(buildRequest(headers, baseUrl + putRequest.path.value, _.put(body)), getResponse)
          .map(Json.parse)
        _ <- jsonIsSuccessful(bodyAsJson)
      } yield JsonResponse(bodyAsJson)
    }

    private def put[REQ: Writes, RESP: Reads](
        req: REQ,
        path: String,
        putHeaders: Map[String, String],
    ): ClientFailableOp[RESP] = {
      val body = createBody[REQ](req)
      for {
        bodyAsJson <- sendRequest(buildRequest(putHeaders, baseUrl + path, _.put(body)), getResponse).map(Json.parse)
        _ <- jsonIsSuccessful(bodyAsJson)
        respModel <- toResult[RESP](bodyAsJson)
      } yield respModel
    }

    def put[REQ: Writes, RESP: Reads](req: REQ, path: String): ClientFailableOp[RESP] =
      put(req, path, headers)

    def put[REQ: Writes, RESP: Reads](
        req: REQ,
        path: String,
        apiVersionHeader: (String, String),
    ): ClientFailableOp[RESP] =
      put(req, path, headers + apiVersionHeader)

    def post[REQ: Writes, RESP: Reads](
        req: REQ,
        path: String,
        skipCheck: IsCheckNeeded = WithCheck,
    ): ClientFailableOp[RESP] = {
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

    def delete[RESP: Reads](path: String, skipCheck: IsCheckNeeded = WithCheck): ClientFailableOp[RESP] =
      for {
        bodyAsJson <- sendRequest(buildRequest(headers, baseUrl + path, _.delete()), getResponse).map(Json.parse)
        _ <- if (skipCheck == WithoutCheck) ClientSuccess(()) else jsonIsSuccessful(bodyAsJson)
        respModel <- toResult[RESP](bodyAsJson)
      } yield respModel

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
    toClientFailableOp(response).map(_.value)
  }

  def toClientFailableOp(response: Response): ClientFailableOp[BodyAsString] =
    toClientFailableOp(maybeErrorBodyParser = None)(response)

  def toClientFailableOp(maybeErrorBodyParser: Option[String => ClientFailure])(
      response: Response,
  ): ClientFailableOp[BodyAsString] =
    httpIsSuccessful(response, maybeErrorBodyParser).map(_ => response).map(_.body.string).map(BodyAsString.apply)

  def buildRequest(
      headers: Map[String, String],
      url: String,
      addMethod: Request.Builder => Request.Builder,
  ): Request = {
    val builder = headers.foldLeft(new Request.Builder())({ case (builder, (header, value)) =>
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

  case class ContentType(value: String) extends AnyVal
  val JsonContentType = ContentType("application/json")
  // todo see how to fix this correctly
  def createBodyFromString(bodyAsString: BodyAsString, contentType: ContentType = JsonContentType): RequestBody = {
    RequestBody.create(MediaType.parse(contentType.value), bodyAsString.value)
  }
}
