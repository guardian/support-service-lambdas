package com.gu.productmove

import com.amazonaws.services.lambda.runtime.*
import com.amazonaws.services.lambda.runtime.events.{APIGatewayV2HTTPEvent, APIGatewayV2HTTPResponse}
import com.gu.productmove.GuStageLive.Stage
import com.gu.productmove.endpoint.available.AvailableProductMovesEndpoint
import com.gu.productmove.endpoint.move.{ProductMoveEndpoint, ProductMoveEndpointTypes}
import com.gu.productmove.framework.ZIOApiGatewayRequestHandler
import com.gu.productmove.framework.ZIOApiGatewayRequestHandler.TIO
import com.gu.productmove.zuora.rest.{ZuoraClient, ZuoraClientLive, ZuoraGet, ZuoraGetLive}
import com.gu.productmove.zuora.{GetSubscription, GetSubscriptionLive}
import software.amazon.awssdk.auth.credentials.*
import software.amazon.awssdk.regions.Region
import software.amazon.awssdk.services.s3.S3Client
import software.amazon.awssdk.services.s3.model.{GetObjectRequest, S3Exception}
import software.amazon.awssdk.utils.SdkAutoCloseable
import sttp.apispec.openapi.Info
import sttp.capabilities.WebSockets
import sttp.capabilities.zio.ZioStreams
import sttp.client3.*
import sttp.client3.httpclient.zio.HttpClientZioBackend
import sttp.client3.logging.{Logger, LoggingBackend}
import sttp.model.*
import sttp.tapir.*
import sttp.tapir.docs.openapi.OpenAPIDocsInterpreter
import sttp.tapir.json.zio.*
import sttp.tapir.server.ServerEndpoint
import sttp.tapir.serverless.aws.lambda.*
import zio.*
import zio.ZIO.attemptBlocking
import zio.json.*

import scala.concurrent.Future
import scala.jdk.CollectionConverters.*
import scala.util.Try

// this handler contains all the endpoints
object Handler extends ZIOApiGatewayRequestHandler {

  @main
  // run this to test locally via console with some hard coded data
  def testProductMove(): Unit = super.runTest(
    "POST",
    "/product-move/A-S123",
    Some(ProductMoveEndpointTypes.ExpectedInput("false").toJson)
  )

  @main
  // run this to test locally via console with some hard coded data
  def testAvailableMoves(): Unit = super.runTest(
    "GET",
    "/available-product-moves/A-S123",
    None
  )

  @main
  // this will output the yaml to the console
  def testDocs(): Unit = {
    Handler.runTest(
      "GET",
      "/docs/docs.yaml",
      None
    )
  }

  // this represents all the routes for the server
  override val server: List[ServerEndpoint[Any, TIO]] = List(
    AvailableProductMovesEndpoint.server,
    ProductMoveEndpoint.server,
  )

}

// called from genDocs command in build.sbt
object MakeDocsYaml {
  import sttp.apispec.openapi.circe.yaml.*

  val description =
    """API to facilitate replacing an existing subscription
      |with another subscription for a different type of product.""".stripMargin

  def main(args: Array[String]): Unit = {
    val endpoints: Iterable[AnyEndpoint] = Handler.server.map(_.endpoint)
    val docs = OpenAPIDocsInterpreter().toOpenAPI(endpoints, Info("Product Movement API", "0.0.1", Some(description)))
    val yaml = docs.toYaml

    args.headOption match {
      case None =>
        println("Syntax: $0 <pathname.yaml>")
      case Some(yamlFilename) if yamlFilename.endsWith(".yaml") =>
        import java.io.*
        val writer = new PrintWriter(new File(yamlFilename))
        val maybeFileOps = Try {
          writer.write(yaml)
        }
        val maybeClose = Try(writer.close)
        maybeFileOps.get // throws
        maybeClose.get // throws
        println("Wrote yaml docs to " + yamlFilename)
      case Some(_) =>
        println("File name passed in must end in .yaml")
    }
  }
}
