package com.gu.productmove.endpoint.available

import com.gu.productmove.endpoint.available.AvailableProductMovesEndpointTypes.*
import com.gu.productmove.framework.ZIOApiGatewayRequestHandler.TIO
import com.gu.productmove.framework.{LambdaEndpoint, ZIOApiGatewayRequestHandler}
import com.gu.productmove.zuora.rest.{ZuoraClientLive, ZuoraGetLive}
import com.gu.productmove.zuora.{GetSubscription, GetSubscriptionLive}
import com.gu.productmove.{AwsCredentialsLive, AwsS3Live, GuStageLive, SttpClientLive}
import sttp.tapir.*
import sttp.tapir.EndpointIO.Example
import sttp.tapir.EndpointOutput.StatusCode
import sttp.tapir.Schema
import sttp.tapir.json.zio.jsonBody
import zio.ZIO
import zio.json.{DeriveJsonDecoder, DeriveJsonEncoder, JsonDecoder, JsonEncoder}

// this is the description for just the one endpoint
object AvailableProductMovesEndpoint {

  // run this to test locally via console with some hard coded data
  def main(args: Array[String]): Unit = LambdaEndpoint.runTest(
    run("false")
  )

  val server: sttp.tapir.server.ServerEndpoint.Full[Unit, Unit, String, Unit, OutputBody, Any, ZIOApiGatewayRequestHandler.TIO] = {
    val subscriptionNameCapture: EndpointInput.PathCapture[String] =
      EndpointInput.PathCapture[String](
        Some("subscriptionName"),
        implicitly,
        EndpointIO.Info.empty.copy(description = Some("Name of subscription whose eligibility for movement is to be checked."), examples = List(Example("A-S000001", None, None))) // A-S000001
      )
    endpoint
      .get
      .in("available-product-moves").in(subscriptionNameCapture)
      .out(oneOf(
        oneOfVariant(sttp.model.StatusCode.Ok, jsonBody[List[MoveToProduct]].map(Success.apply)(_.body).copy(info = EndpointIO.Info.empty.copy(description = Some("Success.")))),
        oneOfVariant(sttp.model.StatusCode.NotFound, stringBody.map(NotFound.apply)(_.textResponse).copy(info = EndpointIO.Info.empty.copy(description = Some("No such subscription.")))),
      ))
      .summary("Gets available products that can be moved to from the given subscription.")
      .description(
        """Returns an array of eligible products that the given subscription could be moved to,
          |which will be empty if there aren't any for the given subscription.
          |""".stripMargin)
      .serverLogic[TIO] { subscriptionName => run(subscriptionName).tapEither(result => ZIO.log("result tapped: " + result)).map(Right.apply) }
  }

  private def run(subscriptionName: String): TIO[OutputBody] =
    runWithEnvironment(subscriptionName).provide(
      AwsS3Live.layer,
      AwsCredentialsLive.layer,
      SttpClientLive.layer,
      ZuoraClientLive.layer,
      GetSubscriptionLive.layer,
      ZuoraGetLive.layer,
      GuStageLive.layer,
    )

  private[productmove] def runWithEnvironment(subscriptionName: String): ZIO[GetSubscription, String, OutputBody] =
    for {
      _ <- ZIO.log("subscription name: " + subscriptionName)
      sub <- GetSubscription.get(if (subscriptionName == "true") "A-S00090478" else "A-S00339056") //DEV - for testing locally
      _ <- ZIO.log("Sub: " + sub.toString)
    } yield Success(List(
      MoveToProduct(
        id = "123",
        name = "Digital Pack",
        billing = Billing(
          amount = Some(1199),
          percentage = None,
          currency = Currency.GBP,
          frequency = Some(TimePeriod(TimeUnit.month, 1)),
          startDate = Some("2022-09-21")
        ),
        trial = Some(Trial(14)),
        introOffer = Some(Offer(
          Billing(
            amount = None,
            percentage = Some(50),
            currency = Currency.GBP,//FIXME doesn't make sense for a percentage
            frequency = None,//FIXME doesn't make sense for a percentage
            startDate = Some("2022-09-21")
          ),
          duration = TimePeriod(TimeUnit.month, 3)
        ))
      )
    ))

}
