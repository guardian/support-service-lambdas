package com.gu.productmove.available

import com.gu.productmove.*
import com.gu.productmove.framework.ZIOApiGatewayRequestHandler.TIO
import com.gu.productmove.framework.{LambdaEndpoint, ZIOApiGatewayRequestHandler}
import com.gu.productmove.available.AvailableProductMovesEndpointTypes.*
import com.gu.productmove.zuora.rest.{ZuoraClientLive, ZuoraGetLive}
import com.gu.productmove.zuora.{GetSubscription, GetSubscriptionLive}
import sttp.tapir.*
import sttp.tapir.EndpointIO.Example
import sttp.tapir.generic.auto.*
import sttp.tapir.json.zio.jsonBody
import zio.ZIO
import zio.json.{DeriveJsonDecoder, DeriveJsonEncoder, JsonDecoder, JsonEncoder}

// this is the description for just the one endpoint
object AvailableProductMovesEndpoint {

  // run this to test locally via console with some hard coded data
  def main(args: Array[String]): Unit = LambdaEndpoint.runTest(
    run(ExpectedInput(false))
  )

  val server: sttp.tapir.server.ServerEndpoint.Full[Unit, Unit, (String,
    AvailableProductMovesEndpointTypes.ExpectedInput
    ), Unit, AvailableProductMovesEndpointTypes.OutputBody, Any,
    ZIOApiGatewayRequestHandler.TIO
  ] = {
    val subscriptionNameCapture: EndpointInput.PathCapture[String] =
      EndpointInput.PathCapture[String](
        Some("subscriptionName"),
        implicitly,
        EndpointIO.Info.empty.copy(description = Some("Name of subscription whose eligibility for movement is to be checked."), examples = List(Example("A-S000001", None, None))) // A-S000001
      )
    endpoint
      .get
      .in("available-product-moves").in(subscriptionNameCapture)
      .in(jsonBody[ExpectedInput])
      .out(jsonBody[OutputBody])
      .summary("Gets available products that can be moved to from the given subscription.")
      .description(
        """Returns an array of eligible products that the given subscription could be moved to,
          |which will be empty if there aren't any for the given subscription.
          |""".stripMargin)
      .serverLogic[TIO] { (_, input) => run(input).tapEither(result => ZIO.log("result tapped: " + result)).map(Right.apply) }
  }
  
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
