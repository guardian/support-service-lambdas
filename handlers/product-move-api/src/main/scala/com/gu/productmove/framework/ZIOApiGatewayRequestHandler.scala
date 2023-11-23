package com.gu.productmove.framework

import com.amazonaws.services.lambda.runtime.*
import com.amazonaws.services.lambda.runtime.events.*
import com.gu.productmove
import sttp.tapir.server.ServerEndpoint
import sttp.tapir.serverless.aws.lambda.*
import sttp.tapir.serverless.aws.ziolambda.AwsZioServerInterpreter
import sttp.tapir.swagger.bundle.SwaggerInterpreter
import sttp.tapir.ztapir.RIOMonadError
import zio.{IO, Runtime, Task, ZIO, *}

import scala.jdk.CollectionConverters.*

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
          userAgent = "",
        ),
      ),
      body = testInput,
      isBase64Encoded = false,
    )
  }

  val server: List[ServerEndpoint[Any, Task]]

  // this is the main lambda entry point.  It is referenced in the cloudformation.
  // TODO most of this can probably be replaced with https://github.com/softwaremill/tapir/blob/9ac47f0d2ce4b3a91aeba97221a7ee6cd94e0bfe/serverless/aws/lambda-zio/src/main/scala/sttp/tapir/serverless/aws/ziolambda/ZioLambdaHandler.scala
  override def handleRequest(
      javaRequest: APIGatewayV2WebSocketEvent,
      context: Context,
  ): APIGatewayV2WebSocketResponse = {

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

  private def handleWithLoggerAndErrorHandling(awsRequest: AwsRequest, context: Context): AwsResponse = {
    val swaggerEndpoints = SwaggerInterpreter().fromServerEndpoints[Task](server, "My App", "1.0")

    given RIOMonadError[Any] = new RIOMonadError[Any]

    val route: Route[Task] = AwsZioServerInterpreter().toRoute(server ++ swaggerEndpoints)
    val routedTask: Task[AwsResponse] = route(awsRequest)
    val runtime = Runtime.default
    Unsafe.unsafe { implicit u =>
      runtime.unsafe.run(
        routedTask
          .provideLayer(Runtime.removeDefaultLoggers)
          .provideLayer(Runtime.addLogger(new AwsLambdaLogger(context.getLogger))),
      ) match
        case Exit.Success(value) => value
        case Exit.Failure(cause) =>
          context.getLogger.log("Failed with: " + cause.prettyPrint)
          AwsResponse(false, 500, Map.empty, "")
    }
  }

}

class AwsLambdaLogger(lambdaLogger: LambdaLogger) extends ZLogger[String, Unit] {
  override def apply(
      trace: Trace,
      fiberId: FiberId,
      logLevel: LogLevel,
      message: () => String,
      cause: Cause[Any],
      context: FiberRefs,
      spans: List[LogSpan],
      annotations: Map[String, String],
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
