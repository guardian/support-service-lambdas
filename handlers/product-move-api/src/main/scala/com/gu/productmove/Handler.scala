package com.gu.productmove

import com.amazonaws.services.lambda.runtime.*
import com.amazonaws.services.lambda.runtime.events.{APIGatewayV2HTTPEvent, APIGatewayV2HTTPResponse}
import com.gu.productmove
import com.gu.productmove.GuStageLive.Stage
import com.gu.productmove.zuora.{GetSubscription, ZuoraClient, ZuoraClientLive}
import software.amazon.awssdk.auth.credentials.*
import software.amazon.awssdk.regions.Region
import software.amazon.awssdk.services.s3.S3Client
import software.amazon.awssdk.services.s3.model.{GetObjectRequest, S3Exception}
import software.amazon.awssdk.utils.SdkAutoCloseable
import sttp.capabilities.WebSockets
import sttp.capabilities.zio.ZioStreams
import sttp.client3.httpclient.zio.{HttpClientZioBackend, SttpClient, send}
import sttp.client3.logging.{Logger, LoggingBackend}
import sttp.client3.{logging, *}
import sttp.model.*
import zio.*
import zio.ZIO.attemptBlocking
import zio.json.*

object Handler extends RequestHandler[APIGatewayV2HTTPEvent, APIGatewayV2HTTPResponse] {

  val testInput: String = """{ "dummy": false }"""

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

      override def getLogger: LambdaLogger = ???
    }
    val response = handleRequest(input, context)
    println("response: " + response)
  }

  // this is the main lambda entry point.  It is referenced in the cloudformation.
  override def handleRequest(input: APIGatewayV2HTTPEvent, context: Context): APIGatewayV2HTTPResponse = {
    Runtime.default.unsafeRun(
      run(input)
        .provide(
          AwsS3Live.layer,
          AwsCredentialsLive.layer,
          SttpClientLive.layer,
          ZuoraClientLive.layer,
          GuStageLive.layer,
        )
    )
  }

  case class ExpectedInput(dummy: Boolean)

  given JsonDecoder[ExpectedInput] = DeriveJsonDecoder.gen[ExpectedInput]

  def run(input: APIGatewayV2HTTPEvent): ZIO[ZuoraClient, Nothing, APIGatewayV2HTTPResponse] = {
    (for {
      postData <- ZIO.fromEither(input.getBody.fromJson[ExpectedInput])
      subscriptionNumber = "A-S00339056" //DEV - for testing locally
      sub <- GetSubscription.get(subscriptionNumber)
      _ <- ZIO.log("PostData: " + postData.toString)
      _ <- ZIO.log("Sub: " + sub.toString)
    } yield APIGatewayV2HTTPResponse.builder().withStatusCode(200).build())
      .catchAll { message =>
        for {
          _ <- ZIO.log(message)
        } yield APIGatewayV2HTTPResponse.builder().withStatusCode(500).build()

      }
  }

}

