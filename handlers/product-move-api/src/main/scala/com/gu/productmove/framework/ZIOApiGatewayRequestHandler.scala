package com.gu.productmove.framework

import cats.effect.Sync
import cats.effect.kernel.{CancelScope, Poll}
import com.amazonaws.services.lambda.runtime.*
import com.amazonaws.services.lambda.runtime.events.*
import com.amazonaws.services.lambda.runtime.events.APIGatewayV2HTTPEvent.RequestContext
import com.gu.productmove
import com.gu.productmove.GuStageLive.Stage
import com.gu.productmove.framework.ZIOApiGatewayRequestHandler.TIO
import com.gu.productmove.zuora.rest.{ZuoraClient, ZuoraClientLive, ZuoraGet, ZuoraGetLive}
import com.gu.productmove.zuora.{GetSubscription, GetSubscriptionLive}
import software.amazon.awssdk.auth.credentials.*
import software.amazon.awssdk.regions.Region
import software.amazon.awssdk.services.s3.S3Client
import software.amazon.awssdk.services.s3.model.{GetObjectRequest, S3Exception}
import software.amazon.awssdk.utils.SdkAutoCloseable
import sttp.capabilities
import sttp.capabilities.WebSockets
import sttp.capabilities.zio.ZioStreams
import sttp.client3.*
import sttp.client3.httpclient.zio.{HttpClientZioBackend, SttpClient, send}
import sttp.client3.logging.{Logger, LoggingBackend}
import sttp.model.*
import sttp.monad.MonadError
import sttp.tapir.capabilities.NoStreams
import sttp.tapir.model.{ConnectionInfo, ServerRequest}
import sttp.tapir.server.ServerEndpoint
import sttp.tapir.server.interceptor.reject.RejectInterceptor
import sttp.tapir.server.interceptor.{CustomiseInterceptors, RequestResult}
import sttp.tapir.server.interpreter.*
import sttp.tapir.serverless.aws.lambda.*
import sttp.tapir.swagger.bundle.SwaggerInterpreter
import sttp.tapir.{AttributeKey, AttributeMap, CodecFormat, RawBodyType, WebSocketBodyOutput}
import zio.ZIO.attemptBlocking
import zio.json.*
import zio.{IO, Runtime, ZIO, *}

import java.io.{ByteArrayInputStream, InputStream, OutputStream}
import java.net.{InetSocketAddress, URLDecoder}
import java.nio.ByteBuffer
import java.nio.charset.Charset
import java.util.Base64
import scala.concurrent.Future
import scala.jdk.CollectionConverters.*
import scala.util.{Success, Try}

object ZIOApiGatewayRequestHandler {

  type TIO[+A] = ZIO[Any, Any, A] // Succeed with an `A`, may fail with anything`, no requirements.

}

trait ZIOApiGatewayRequestHandler extends RequestHandler[APIGatewayV2WebSocketEvent, APIGatewayV2WebSocketResponse] {

  // for testing
  def runTest(method: String, path: String, testInput: Option[String]): Unit = {
    val input = makeTestRequest(method, path, testInput)
    val context = new TestContext()
    val response = handleWithLoggerAndErrorHandling(input, context)
    println("response: " + response)
  }

  private def makeTestRequest(method: String, path: String, testInput: Option[String]) = {
    AwsRequest(
      rawPath = path,
      rawQueryString = "",
      headers = Map.empty,
      requestContext = AwsRequestContext(
        domainName = None,
        http = AwsHttp(
          method = method,
          path = path,
          protocol = "",
          sourceIp = "",
          userAgent = ""
        )
      ),
      body = testInput,
      isBase64Encoded = false
    )
  }

  val server: List[ServerEndpoint[Any, TIO]]

  // this is the main lambda entry point.  It is referenced in the cloudformation.
  override def handleRequest(javaRequest: APIGatewayV2WebSocketEvent, context: Context): APIGatewayV2WebSocketResponse = {

    context.getLogger.log("Lambda input: " + javaRequest)

    val awsRequest: AwsRequest = RequestMapper.convertJavaRequestToTapirRequest(javaRequest)
    val response: AwsResponse = handleWithLoggerAndErrorHandling(awsRequest, context)

    val javaResponse = new APIGatewayV2WebSocketResponse()
    javaResponse.setStatusCode(response.statusCode)
    javaResponse.setHeaders(response.headers.asJava)
//    javaResponse.setCookies(response.cookies.asJava) if we need cookies in future
    javaResponse.setBody(response.body)
    javaResponse.setIsBase64Encoded(response.isBase64Encoded)

    context.getLogger.log("Lambda output: " + javaResponse)

    javaResponse

  }

  private def handleWithLoggerAndErrorHandling(awsRequest: AwsRequest, context: Context) = {
    val swaggerEndpoints = SwaggerInterpreter().fromServerEndpoints[TIO](server, "My App", "1.0")

    val route: Route[TIO] = TIOInterpreter().toRoute(server ++ swaggerEndpoints)
    val routedTask: TIO[AwsResponse] = route(awsRequest)
    val runtime = Runtime.default
    runtime.unsafeRun(
      routedTask
        .catchAll { error =>
          ZIO.log(error.toString)
            .map(_ => AwsResponse(Nil, false, 500, Map.empty, ""))
        }
        .provideLayer(Runtime.removeDefaultLoggers)
        .provideLayer(Runtime.addLogger(new AwsLambdaLogger(context.getLogger)))
    )
  }

}

class AwsLambdaLogger(lambdaLogger: LambdaLogger) extends ZLogger[String, Unit] {
  override def apply(
    trace: Trace,
    fiberId: FiberId,
    logLevel: LogLevel,
    message: () => String,
    cause: Cause[Any],
    context: Map[FiberRef[_], Any],
    spans: List[LogSpan],
    annotations: Map[String, String]
  ): Unit = lambdaLogger.log(message())
}

class TestContext() extends Context {
  override def getAwsRequestId: String = ???

  override def getLogGroupName: String = ???

  override def getLogStreamName: String = ???

  override def getFunctionName: String = ???

  override def getFunctionVersion: String = ???

  override def getInvokedFunctionArn: String = ???

  override def getIdentity: CognitoIdentity = ???

  override def getClientContext: ClientContext = ???

  override def getRemainingTimeInMillis: Int = ???

  override def getMemoryLimitInMB: Int = ???

  override def getLogger: LambdaLogger = new LambdaLogger:
    override def log(message: String): Unit = {
      val now = java.time.Instant.now().toString
      println(s"$now: $message")
    }

    override def log(message: Array[Byte]): Unit = println(s"LOG BYTES: ${message.toString}")
}

