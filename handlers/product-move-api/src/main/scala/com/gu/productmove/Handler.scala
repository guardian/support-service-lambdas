package com.gu.productmove

import com.amazonaws.services.lambda.runtime.*
import com.amazonaws.services.lambda.runtime.events.{APIGatewayV2HTTPEvent, APIGatewayV2HTTPResponse}
import com.gu.productmove.GuStageLive.Stage
import com.gu.productmove.ZIOApiGatewayRequestHandler.TIO
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
import sttp.tapir.*
import sttp.tapir.generic.auto.*
import sttp.tapir.json.zio.*
import sttp.tapir.server.ServerEndpoint
import sttp.tapir.serverless.aws.lambda.*
import zio.*
import zio.ZIO.attemptBlocking
import zio.json.*

import scala.concurrent.Future
import scala.jdk.CollectionConverters.*

// this handler contains all the endpoints
object Handler extends ZIOApiGatewayRequestHandler {

  // run this to test locally via console with some hard coded data
  def main(args: Array[String]): Unit = super.runTest(
    "POST",
    "/product-move/A-S123",
    Some(ProductMoveEndpointTypes.ExpectedInput(false).toJson)
  )

  // this represents all the routes for the server
  override val server: List[ServerEndpoint[Any, TIO]] = List(
    ProductMoveEndpoint.server
  )

}

object TestDocs {
  def main(args: Array[String]): Unit = {
    Handler.runTest(
      "GET",
      "/docs/",
      None
    )
  }
}
