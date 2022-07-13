package com.gu.productmove.endpoint.move

import com.gu.productmove.endpoint.available.{Billing, Currency, MoveToProduct, Offer, TimePeriod, TimeUnit, Trial}
import com.gu.productmove.endpoint.move.ProductMoveEndpointTypes.*
import com.gu.productmove.framework.ZIOApiGatewayRequestHandler.TIO
import com.gu.productmove.framework.{LambdaEndpoint, ZIOApiGatewayRequestHandler}
import com.gu.productmove.zuora.rest.{ZuoraClientLive, ZuoraGet, ZuoraGetLive}
import com.gu.productmove.zuora.{GetSubscription, GetSubscriptionLive, Subscribe, SubscribeLive}
import com.gu.productmove.{AwsCredentialsLive, AwsS3Live, GuStageLive, SttpClientLive}
import sttp.tapir.*
import sttp.tapir.EndpointIO.Example
import sttp.tapir.Schema
import sttp.tapir.json.zio.jsonBody
import zio.ZIO
import zio.json.{DeriveJsonDecoder, DeriveJsonEncoder, JsonDecoder, JsonEncoder}

// this is the description for just the one endpoint
object ProductMoveEndpoint {

  // run this to test locally via console with some hard coded data
  def main(args: Array[String]): Unit = LambdaEndpoint.runTest(
    run(ExpectedInput("false"))
  )

  val server: sttp.tapir.server.ServerEndpoint.Full[Unit, Unit, (String,
    ProductMoveEndpointTypes.ExpectedInput
    ), Unit, ProductMoveEndpointTypes.OutputBody, Any,
    ZIOApiGatewayRequestHandler.TIO
  ] = {
    val subscriptionNameCapture: EndpointInput.PathCapture[String] =
      EndpointInput.PathCapture[String](
        Some("subscriptionName"),
        implicitly,
        EndpointIO.Info.empty.copy(description = Some("Name of subscription to be moved to a different product."), examples = List(Example("A-S000001", None, None))) // A-S000001
      )
    val endpointDescription: PublicEndpoint[(String, ProductMoveEndpointTypes.ExpectedInput), Unit, ProductMoveEndpointTypes.OutputBody, Any] =
      endpoint
        .post
        .in("product-move").in(subscriptionNameCapture)
        .in(jsonBody[ExpectedInput].copy(info = EndpointIO.Info.empty[ExpectedInput].copy(description = Some("Definition of required movement."))))
        .out(oneOf(
          oneOfVariant(sttp.model.StatusCode.Ok, jsonBody[Success].copy(info = EndpointIO.Info.empty.copy(description = Some("Success.")))),
          oneOfVariant(sttp.model.StatusCode.NotFound, stringBody.map(NotFound.apply)(_.textResponse).copy(info = EndpointIO.Info.empty.copy(description = Some("No such subscription.")))),
        ))
        .summary("Replaces the existing subscription with a new one.")
        .description(
          """Cancels the existing subscription and replaces it with a new subscription
            |to a different type of product.
            |Also manages all the service comms associated with the movement.""".stripMargin
        )
    endpointDescription
      .serverLogic[TIO] { (_, input) => run(input).tapEither(result => ZIO.log("result tapped: " + result)).map(Right.apply) }
  }



  private def run(input: ExpectedInput): TIO[OutputBody] = {
    val value: ZIO[ZuoraGet & Subscribe, String, OutputBody] = productMove(input).provideSomeLayer(GetSubscriptionLive.layer)
    val value1: ZIO[ZuoraGet, String, OutputBody] = value.provideSomeLayer(SubscribeLive.layer)

    value1.provide(
      AwsS3Live.layer,
      AwsCredentialsLive.layer,
      SttpClientLive.layer,
      ZuoraClientLive.layer,
      ZuoraGetLive.layer,
      GuStageLive.layer,
    )
  }

  private[productmove] def productMove(postData: ExpectedInput): ZIO[GetSubscription & Subscribe, String, OutputBody] =
    for {
      _ <- ZIO.log("PostData: " + postData.toString)
      subscription <- GetSubscription.get("8ad0950c81b4f9990181cb0515e52670")
      createRequestBody <- Subscribe.createRequestBody(subscription.accountId, postData.targetProductId)
      newSubscriptionId <- Subscribe.create(createRequestBody)
      _ <- ZIO.log("Sub: " + newSubscriptionId.toString)
    } yield Success("asdf", MoveToProduct(
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
    ))
}
