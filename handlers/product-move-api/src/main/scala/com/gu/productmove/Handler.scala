package com.gu.productmove

import com.amazonaws.services.lambda.runtime.*
import com.amazonaws.services.lambda.runtime.events.{APIGatewayV2HTTPEvent, APIGatewayV2HTTPResponse}
import com.gu.productmove.GuStageLive.Stage
import com.gu.productmove.HandlerTypes.*
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

import scala.jdk.CollectionConverters.*

object Handler extends ZIOApiGatewayRequestHandler[ExpectedInput, OutputBody] {

  override val testInput: String = """{ "dummy": false }"""

  override def run(input: ExpectedInput): IO[Any, OutputBody] =
    runWithEnvironment(input).provide(
      AwsS3Live.layer,
      AwsCredentialsLive.layer,
      SttpClientLive.layer,
      ZuoraClientLive.layer,
      GetSubscriptionLive.layer,
      ZuoraGetLive.layer,
      GuStageLive.layer,
    )

  private def runWithEnvironment(postData: ExpectedInput): ZIO[GetSubscription, String, OutputBody] =
    for {
      _ <- ZIO.log("PostData: " + postData.toString)
      sub <- GetSubscription.get("A-S00339056") //DEV - for testing locally
      _ <- ZIO.log("Sub: " + sub.toString)
    } yield OutputBody("hello")

}

