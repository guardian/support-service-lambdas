package com.gu.productmove.endpoint.move

import com.gu.productmove.endpoint.available.AvailableProductMovesEndpointTypes.InternalServerError
import com.gu.productmove.endpoint.available.{Billing, Currency, MoveToProduct, Offer, TimePeriod, TimeUnit, Trial}
import com.gu.productmove.endpoint.move.ProductMoveEndpointTypes.*
import com.gu.productmove.framework.ZIOApiGatewayRequestHandler.TIO
import com.gu.productmove.framework.{LambdaEndpoint, ZIOApiGatewayRequestHandler}
import com.gu.productmove.zuora.rest.{ZuoraClientLive, ZuoraGet, ZuoraGetLive}
import com.gu.productmove.zuora.{GetAccount, GetSubscription, GetSubscriptionLive, Subscribe, SubscribeLive, ZuoraCancel, ZuoraCancelLive}
import com.gu.productmove.{AwsCredentialsLive, AwsS3Live, EmailSender, GuStageLive, SttpClientLive}
import sttp.tapir.*
import sttp.tapir.EndpointIO.Example
import sttp.tapir.Schema
import sttp.tapir.json.zio.jsonBody
import zio.{Clock, ZIO}
import zio.json.{DeriveJsonDecoder, DeriveJsonEncoder, JsonDecoder, JsonEncoder}

// this is the description for just the one endpoint
object ProductMoveEndpoint {

  // run this to test locally via console with some hard coded data
  def main(args: Array[String]): Unit = LambdaEndpoint.runTest(
    run("zuoraAccountId", ExpectedInput("targetProductId"))
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
      .serverLogic[TIO] { (subscriptionName, postData) => run(subscriptionName, postData).tapEither(result => ZIO.log("result tapped: " + result)).map(Right.apply) }
  }

  private def run(subscriptionName: String, postData: ExpectedInput): TIO[OutputBody] =
    productMove(subscriptionName, postData).provide(
      SubscribeLive.layer,
      GetSubscriptionLive.layer,
      ZuoraCancelLive.layer,
      AwsS3Live.layer,
      AwsCredentialsLive.layer,
      SttpClientLive.layer,
      ZuoraClientLive.layer,
      ZuoraGetLive.layer,
      GuStageLive.layer,
    )

  extension[R, E, A] (zio: ZIO[R, E, A])
    def handleError(message: String) = zio.catchAll {
      error =>
        ZIO.log(s"$message failed with: $error").flatMap(_ => ZIO.fail(InternalServerError))
    }

  private[productmove] def productMove(subscriptionName: String, postData: ExpectedInput): ZIO[GetSubscription with Subscribe with ZuoraCancel, String, OutputBody] =
    for {
      _ <- ZIO.log("PostData: " + postData.toString)
      subscription <- GetSubscription.get(subscriptionName)

      chargedThroughDate <- ZIO.fromOption(subscription.ratePlans.head.ratePlanCharges.head.chargedThroughDate).orElseFail(s"chargedThroughDate is null for subscription $subscriptionName.")

      _ <- ZuoraCancel.cancel(subscriptionName, chargedThroughDate)
      newSubscriptionId <- Subscribe.create(subscription.accountId, postData.targetProductId)

      account <- GetAccount.get(subscription.accountNumber).handleError("GetAccount")

      _ <- EmailSender.sendEmail(
        message = EmailMessage(
          EmailPayload(
            Address = contact.Email,
            ContactAttributes = EmailPayloadContactAttributes(
              SubscriberAttributes = EmailPayloadSubscriberAttributes(
                title =
                  contact.FirstName flatMap (_ =>
                    contact.Salutation
                    ), // if no first name, we use salutation as first name and leave this field empty
                first_name = account.basicInfo.firstName,
                last_name = account.basicInfo.lastName,
                payment_amount = estimatedNewPrice,
                next_payment_date = startDate,
                payment_frequency = paymentFrequency,
                subscription_id = subscription.id,
                product_type = sfSubscription.Product_Type__c.getOrElse("")
              )
            )
          ),
          brazeCampaignName,
          contact.Id,
          contact.IdentityID__c
        )
      )

      _ <- ZIO.log("Sub: " + newSubscriptionId.toString)
    } yield Success(newSubscriptionId.subscriptionId, MoveToProduct(
      id = "123",
      name = "Digital Pack",
      billing = Billing(
        amount = Some(1199),
        percentage = None,
        currency = Some(Currency.GBP),
        frequency = Some(TimePeriod(TimeUnit.month, 1)),
        startDate = Some("2022-09-21")
      ),
      trial = Some(Trial(14)),
      introOffer = Some(Offer(
        Billing(
          amount = None,
          percentage = Some(50),
          currency = Some(Currency.GBP),//FIXME doesn't make sense for a percentage
          frequency = None,//FIXME doesn't make sense for a percentage
          startDate = Some("2022-09-21")
        ),
        duration = TimePeriod(TimeUnit.month, 3)
      ))
    ))
}
