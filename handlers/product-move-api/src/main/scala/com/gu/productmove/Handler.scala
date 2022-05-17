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
import zio.*
import zio.ZIO.attemptBlocking
import zio.json.*

object Handler extends ZIOApiGatewayRequestHandler {

  override val testInput: String = """{ "dummy": false }"""

  case class ExpectedInput(dummy: Boolean)

  given JsonDecoder[ExpectedInput] = DeriveJsonDecoder.gen[ExpectedInput]

  override def run(input: APIGatewayV2HTTPEvent): IO[Any, APIGatewayV2HTTPResponse] = {
    runWithEnvironment(input)
      .provide(
        AwsS3Live.layer,
        AwsCredentialsLive.layer,
        SttpClientLive.layer,
        ZuoraClientLive.layer,
        GetSubscriptionLive.layer,
        ZuoraGetLive.layer,
        GuStageLive.layer,
      )
  }

  private def runWithEnvironment(input: APIGatewayV2HTTPEvent): ZIO[GetSubscription, String, APIGatewayV2HTTPResponse] = {
    for {
      postData <- ZIO.fromEither(input.getBody.fromJson[ExpectedInput])
      subscriptionNumber = "A-S00339056" //DEV - for testing locally
      sub <- GetSubscription.get(subscriptionNumber)
      _ <- ZIO.log("PostData: " + postData.toString)
      _ <- ZIO.log("Sub: " + sub.toString)
    } yield APIGatewayV2HTTPResponse.builder().withStatusCode(200).build()
  }

}

