package com.gu.productmove

import com.gu.productmove.ZIOApiGatewayRequestHandler.TIO
import com.gu.productmove.zuora.rest.{ZuoraClientLive, ZuoraGetLive}
import com.gu.productmove.zuora.{GetSubscription, GetSubscriptionLive}
import sttp.tapir.json.zio.jsonBody
import sttp.tapir.*
import zio.ZIO
import zio.json.{DeriveJsonDecoder, DeriveJsonEncoder, JsonDecoder, JsonEncoder}
import sttp.tapir.generic.auto._
import ProductMoveEndpointTypes._

// this is the description for just the one endpoint
object ProductMoveEndpoint {

  // run this to test locally via console with some hard coded data
  def main(args: Array[String]): Unit = LambdaEndpoint.runTest(
    run(ExpectedInput(false))
  )

  val server: sttp.tapir.server.ServerEndpoint.Full[Unit, Unit, (List[String],
      com.gu.productmove.ProductMoveEndpointTypes.ExpectedInput
    ), Unit, com.gu.productmove.ProductMoveEndpointTypes.OutputBody, Any,
    com.gu.productmove.ZIOApiGatewayRequestHandler.TIO
    ] =
    endpoint
      .post
      .in("product-move").in(paths)
      .in(jsonBody[ExpectedInput])
      .out(jsonBody[OutputBody])
      .serverLogic[TIO] { (_, input) => run(input).tapEither(result => ZIO.log("result tapped: " + result)).map(Right.apply) }

  private def run(input: ExpectedInput): TIO[OutputBody] =
    runWithEnvironment(input).provide(
      AwsS3Live.layer,
      AwsCredentialsLive.layer,
      SttpClientLive.layer,
      ZuoraClientLive.layer,
      GetSubscriptionLive.layer,
      ZuoraGetLive.layer,
      GuStageLive.layer,
    )

  private[productmove] def runWithEnvironment(postData: ExpectedInput): ZIO[GetSubscription, String, OutputBody] =
    for {
      _ <- ZIO.log("PostData: " + postData.toString)
      sub <- GetSubscription.get(if (postData.uat) "A-S00090478" else "A-S00339056") //DEV - for testing locally
      _ <- ZIO.log("Sub: " + sub.toString)
    } yield OutputBody("hello")

}
