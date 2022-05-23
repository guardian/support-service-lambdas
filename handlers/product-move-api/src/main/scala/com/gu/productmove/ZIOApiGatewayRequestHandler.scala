package com.gu.productmove

import com.amazonaws.services.lambda.runtime.*
import com.amazonaws.services.lambda.runtime.events.{APIGatewayV2HTTPEvent, APIGatewayV2HTTPResponse}
import com.gu.productmove
import com.gu.productmove.GuStageLive.Stage
import com.gu.productmove.zuora.rest.{ZuoraClient, ZuoraClientLive, ZuoraGet, ZuoraGetLive}
import com.gu.productmove.zuora.{GetSubscription, GetSubscriptionLive}
import software.amazon.awssdk.auth.credentials.*
import software.amazon.awssdk.regions.Region
import software.amazon.awssdk.services.s3.S3Client
import software.amazon.awssdk.services.s3.model.{GetObjectRequest, S3Exception}
import software.amazon.awssdk.utils.SdkAutoCloseable
import sttp.capabilities.WebSockets
import sttp.capabilities.zio.ZioStreams
import sttp.client3.*
import sttp.client3.httpclient.zio.{HttpClientZioBackend, SttpClient, send}
import sttp.client3.logging.{Logger, LoggingBackend}
import sttp.model.*
import zio.ZIO.attemptBlocking
import zio.json.*
import zio.{IO, Runtime, ZIO, *}

import scala.jdk.CollectionConverters.*

trait ZIOApiGatewayRequestHandler[IN: JsonDecoder, OUT: JsonEncoder] extends RequestHandler[APIGatewayV2HTTPEvent, APIGatewayV2HTTPResponse] {

  val testInput: String

  // for testing
  def main(args: Array[String]): Unit = {
    val input = new APIGatewayV2HTTPEvent(
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      testInput,
      false,
      null
    )
    val context = new Context {
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
        override def log(message: String): Unit = println(s"LOG: $message")

        override def log(message: Array[Byte]): Unit = println(s"LOG BYTES: ${message.toString}")
    }
    val response = handleRequest(input, context)
    println("response: " + response)
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
    ): Unit = {

      val now = java.time.Instant.now().toString
      val indentedMessage = message().replaceAll("\n", "\n ")

      lambdaLogger.log(s"$now: $indentedMessage")
    }
  }

  // this is the main lambda entry point.  It is referenced in the cloudformation.
  override def handleRequest(input: APIGatewayV2HTTPEvent, context: Context): APIGatewayV2HTTPResponse = {
    val runtime = Runtime.default
    runtime.unsafeRun(
      runJson(input)
        .catchAll { error =>
          ZIO.log(error.toString)
            .map(_ => APIGatewayV2HTTPResponse.builder().withStatusCode(500).build())
        }
        .provideLayer(Runtime.removeDefaultLoggers)
        .provideLayer(Runtime.addLogger(new AwsLambdaLogger(context.getLogger)))
    )
  }

  private def runJson(input: APIGatewayV2HTTPEvent): IO[Any, APIGatewayV2HTTPResponse] =
    for {
      input <- ZIO.fromEither(input.getBody.fromJson[IN])
      output <- run(input)
    } yield {
      APIGatewayV2HTTPResponse
        .builder()
        .withStatusCode(200)
        .withBody(output.toJson)
        .withHeaders(
          Map(
            "Content-type" -> "application/json"
          ).asJava
        )
        .build()
    }

  protected def run(input: IN): IO[Any, OUT]

}
