package com.gu.productmove.framework

import com.gu.productmove.*
import com.gu.productmove.framework.ZIOApiGatewayRequestHandler.TIO
import sttp.capabilities
import sttp.model.*
import sttp.monad.MonadError
import sttp.tapir.capabilities.NoStreams
import sttp.tapir.model.{ConnectionInfo, ServerRequest}
import sttp.tapir.server.ServerEndpoint
import sttp.tapir.server.interceptor.reject.RejectInterceptor
import sttp.tapir.server.interceptor.{CustomiseInterceptors, RequestResult}
import sttp.tapir.server.interpreter.*
import sttp.tapir.serverless.aws.lambda.{AwsRequest, AwsResponse, AwsServerOptions, Route}
import sttp.tapir.{AttributeKey, AttributeMap, CodecFormat, RawBodyType, WebSocketBodyOutput}
import zio.ZIO

import java.io.{ByteArrayInputStream, InputStream}
import java.net.{InetSocketAddress, URLDecoder}
import java.nio.ByteBuffer
import java.nio.charset.Charset
import java.util.Base64
import scala.util.{Success, Try}

// *******
//
// tapir 1.0 doesn't have a ZIO-lambda interpreter (only cats-effect-lambda and future-lambda)
// so below is basically a copy and paste and fill in the blanks.
// Maybe we can contribute this back to the project in a tidied up form.
//
// *******
object TIOInterpreter {

  given MonadError[TIO] = new MonadError[TIO] {
    override def unit[T](t: T): TIO[T] = ZIO.succeed(t)

    override def map[T, T2](fa: TIO[T])(f: T => T2): TIO[T2] = fa.map(f)

    override def flatMap[T, T2](fa: TIO[T])(f: T => TIO[T2]): TIO[T2] = fa.flatMap(f)

    override def error[T](t: Throwable): TIO[T] = ZIO.fail(t)

    override protected def handleWrappedError[T](rt: TIO[T])(h: PartialFunction[Throwable, TIO[T]]): TIO[T] =
      rt.catchAll { t => // pattern match in case it's a Throwable? TODO
        h.applyOrElse(new RuntimeException(t.toString), _ => rt)
      }

    override def ensure[T](f: TIO[T], e: => TIO[Unit]): TIO[T] = ???
  }

  def apply(): AwsServerInterpreter[TIO] = new AwsServerInterpreter[TIO]() {
    override def awsServerOptions: AwsServerOptions[TIO] = CustomiseInterceptors(
      createOptions = (ci: CustomiseInterceptors[TIO, AwsServerOptions[TIO]]) =>
        AwsServerOptions(encodeResponseBody = false, ci.interceptors),
    ).options
  }

}

import sttp.monad.syntax.*
type LambdaResponseBody = (String, Option[Long])
abstract class AwsServerInterpreter[F[_]: MonadError] {

  def awsServerOptions: AwsServerOptions[F]

  def toRoute(se: ServerEndpoint[Any, F]): Route[F] =
    toRoute(List(se))

  def toRoute(ses: List[ServerEndpoint[Any, F]]): Route[F] = {
    implicit val bodyListener: BodyListener[F, LambdaResponseBody] = new AwsBodyListener[F]

    val interpreter = new ServerInterpreter[Any, F, LambdaResponseBody, NoStreams](
      FilterServerEndpoints(ses),
      new AwsRequestBody[F](),
      new AwsToResponseBody(awsServerOptions),
      RejectInterceptor.disableWhenSingleEndpoint(awsServerOptions.interceptors, ses),
      deleteFile = _ => ().unit, // no file support
    )

    { (request: AwsRequest) =>
      val serverRequest = AwsServerRequest(request)

      interpreter.apply(serverRequest).map {
        case RequestResult.Failure(_) =>
          AwsResponse(
            Nil,
            isBase64Encoded = awsServerOptions.encodeResponseBody,
            StatusCode.NotFound.code,
            Map.empty,
            "",
          )
        case RequestResult.Response(res) =>
          val cookies = res.cookies.collect { case Right(cookie) => cookie.value }.toList
          val baseHeaders = res.headers.groupBy(_.name).map { case (n, v) => n -> v.map(_.value).mkString(",") }
          val allHeaders = res.body match {
            case Some((_, Some(contentLength))) if res.contentLength.isEmpty =>
              baseHeaders + (HeaderNames.ContentLength -> contentLength.toString)
            case _ => baseHeaders
          }
          AwsResponse(
            cookies,
            isBase64Encoded = awsServerOptions.encodeResponseBody,
            res.code.code,
            allHeaders,
            res.body.map(_._1).getOrElse(""),
          )
      }
    }
  }
}

class AwsBodyListener[F[_]: MonadError] extends BodyListener[F, LambdaResponseBody] {
  override def onComplete(body: LambdaResponseBody)(cb: Try[Unit] => F[Unit]): F[LambdaResponseBody] =
    cb(Success(())).map(_ => body)
}

case class AwsServerRequest(request: AwsRequest, attributes: AttributeMap = AttributeMap.Empty) extends ServerRequest {
  private val sttpUri: Uri = {
    val queryString = if (request.rawQueryString.nonEmpty) "?" + request.rawQueryString else ""
    Uri.unsafeParse(s"$protocol://${request.requestContext.domainName.getOrElse("")}${request.rawPath}$queryString")
  }

  override def protocol: String = request.headers.getOrElse("x-forwarded-proto", "http")
  override def connectionInfo: ConnectionInfo =
    ConnectionInfo(None, Some(InetSocketAddress.createUnresolved(request.requestContext.http.sourceIp, 80)), None)
  override def underlying: Any = request
  override def pathSegments: List[String] = {
    request.rawPath.dropWhile(_ == '/').split("/").toList.map(value => URLDecoder.decode(value, "UTF-8"))
  }
  override def queryParameters: QueryParams = sttpUri.params
  override def method: Method = Method.unsafeApply(request.requestContext.http.method)
  override def uri: Uri = sttpUri
  override def headers: Seq[Header] = request.headers.map { case (n, v) => Header(n, v) }.toList

  override def attribute[T](k: AttributeKey[T]): Option[T] = attributes.get(k)
  override def attribute[T](k: AttributeKey[T], v: T): AwsServerRequest = copy(attributes = attributes.put(k, v))

  override def withUnderlying(underlying: Any): ServerRequest =
    AwsServerRequest(request = underlying.asInstanceOf[AwsRequest], attributes)
}
class AwsRequestBody[F[_]: MonadError]() extends RequestBody[F, NoStreams] {
  override val streams: capabilities.Streams[NoStreams] = NoStreams

  override def toRaw[R](serverRequest: ServerRequest, bodyType: RawBodyType[R]): F[RawValue[R]] = {
    val request = awsRequest(serverRequest)
    val decoded =
      if (request.isBase64Encoded) Left(Base64.getDecoder.decode(request.body.getOrElse("")))
      else Right(request.body.getOrElse(""))

    def asByteArray: Array[Byte] = decoded.fold(identity[Array[Byte]], _.getBytes())

    RawValue(bodyType match {
      case RawBodyType.StringBody(charset) => decoded.fold(new String(_, charset), identity[String])
      case RawBodyType.ByteArrayBody => asByteArray
      case RawBodyType.ByteBufferBody => ByteBuffer.wrap(asByteArray)
      case RawBodyType.InputStreamBody => new ByteArrayInputStream(asByteArray)
      case RawBodyType.FileBody => throw new UnsupportedOperationException
      case _: RawBodyType.MultipartBody => throw new UnsupportedOperationException
    }).asInstanceOf[RawValue[R]].unit
  }

  override def toStream(serverRequest: ServerRequest): streams.BinaryStream = throw new UnsupportedOperationException

  private def awsRequest(serverRequest: ServerRequest) = serverRequest.underlying.asInstanceOf[AwsRequest]
}
class AwsToResponseBody[F[_]](options: AwsServerOptions[F]) extends ToResponseBody[LambdaResponseBody, NoStreams] {
  override val streams: capabilities.Streams[NoStreams] = NoStreams

  override def fromRawValue[R](
      v: R,
      headers: HasHeaders,
      format: CodecFormat,
      bodyType: RawBodyType[R],
  ): LambdaResponseBody =
    bodyType match {
      case RawBodyType.StringBody(charset) =>
        val str = v.asInstanceOf[String]
        val r = if (options.encodeResponseBody) Base64.getEncoder.encodeToString(str.getBytes(charset)) else str
        (r, Some(str.length.toLong))

      case RawBodyType.ByteArrayBody =>
        val bytes = v.asInstanceOf[Array[Byte]]
        val r = if (options.encodeResponseBody) Base64.getEncoder.encodeToString(bytes) else new String(bytes)
        (r, Some(bytes.length.toLong))

      case RawBodyType.ByteBufferBody =>
        val byteBuffer = v.asInstanceOf[ByteBuffer]
        val r =
          if (options.encodeResponseBody) Base64.getEncoder.encodeToString(safeRead(byteBuffer))
          else new String(safeRead(byteBuffer))
        (r, None)

      case RawBodyType.InputStreamBody =>
        val stream = v.asInstanceOf[InputStream]
        val r =
          if (options.encodeResponseBody) Base64.getEncoder.encodeToString(stream.readAllBytes())
          else new String(stream.readAllBytes())
        (r, None)

      case RawBodyType.FileBody => throw new UnsupportedOperationException
      case _: RawBodyType.MultipartBody => throw new UnsupportedOperationException
    }

  private def safeRead(byteBuffer: ByteBuffer): Array[Byte] = {
    if (byteBuffer.hasArray) {
      if (byteBuffer.array().length != byteBuffer.limit()) {
        val array = new Array[Byte](byteBuffer.limit())
        byteBuffer.get(array, 0, byteBuffer.limit())
        array
      } else byteBuffer.array()
    } else {
      val array = new Array[Byte](byteBuffer.remaining())
      byteBuffer.get(array)
      array
    }
  }

  override def fromStreamValue(
      v: streams.BinaryStream,
      headers: HasHeaders,
      format: CodecFormat,
      charset: Option[Charset],
  ): LambdaResponseBody =
    throw new UnsupportedOperationException

  override def fromWebSocketPipe[REQ, RESP](
      pipe: streams.Pipe[REQ, RESP],
      o: WebSocketBodyOutput[streams.Pipe[REQ, RESP], REQ, RESP, _, NoStreams],
  ): LambdaResponseBody = throw new UnsupportedOperationException
}
