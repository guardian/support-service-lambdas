package com.gu.productmove.endpoint.move

import com.gu.productmove.endpoint.available.{Billing, Currency, MoveToProduct, Offer, TimePeriod, TimeUnit, Trial}
import com.gu.productmove.endpoint.move.ProductMoveEndpointTypes.*
import com.gu.productmove.GuStageLive.Stage
import com.gu.productmove.framework.ZIOApiGatewayRequestHandler.TIO
import com.gu.productmove.framework.{LambdaEndpoint, ZIOApiGatewayRequestHandler}
import com.gu.productmove.zuora.rest.{ZuoraClientLive, ZuoraGet, ZuoraGetLive}
import com.gu.productmove.zuora.{GetAccount, GetAccountLive, GetSubscription, GetSubscriptionLive, InvoicePreview, InvoicePreviewLive, Subscribe, SubscribeLive, ZuoraCancel, ZuoraCancelLive}
import com.gu.productmove.{AwsCredentialsLive, AwsS3Live, EmailMessage, EmailPayload, EmailPayloadContactAttributes, EmailPayloadSubscriberAttributes, SQS, EmailSenderLive, GuStageLive, SttpClientLive}
import sttp.tapir.*
import sttp.tapir.EndpointIO.Example
import sttp.tapir.Schema
import sttp.tapir.json.zio.jsonBody
import zio.{Clock, URIO, ZIO}
import zio.json.{DeriveJsonDecoder, DeriveJsonEncoder, JsonDecoder, JsonEncoder}

import java.time.LocalDate
import java.time.format.DateTimeFormatter

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
      EmailSenderLive.layer,
      InvoicePreviewLive.layer,
      GetAccountLive.layer,
      GuStageLive.layer,
    )

  extension[R, E, A] (zio: ZIO[R, E, A])
    def mapErrorTo500(message: String) = zio.catchAll {
      error =>
        ZIO.log(s"$message failed with: $error").flatMap(_ => ZIO.fail(InternalServerError))
    }

  private[productmove] def productMove(subscriptionName: String, postData: ExpectedInput): URIO[GetSubscription with Subscribe with ZuoraCancel with GetAccount with InvoicePreview with SQS with Stage, OutputBody] =
    val output = for {
      _ <- ZIO.log("PostData: " + postData.toString)
      subscription <- GetSubscription.get(subscriptionName).mapErrorTo500("GetSubscription")

      chargedThroughDate <- ZIO.fromOption(subscription.ratePlans.head.ratePlanCharges.head.chargedThroughDate).orElse(ZIO.log(s"chargedThroughDate is null for subscription $subscriptionName.").flatMap(_ => ZIO.fail(InternalServerError)))

      newSubscription <- Subscribe.create(subscription.accountId, postData.targetProductId).mapErrorTo500("Subscribe")
      _ <- ZuoraCancel.cancel(subscriptionName, chargedThroughDate).mapErrorTo500("ZuoraCancel")

      getAccountFuture <- GetAccount.get(subscription.accountNumber).mapErrorTo500("GetAccount").fork
      nextInvoiceFuture <- InvoicePreview.get(subscription.accountId, chargedThroughDate).mapErrorTo500(s"InvoicePreview").fork

      requests = getAccountFuture.zip(nextInvoiceFuture)
      responses <- requests.join

      account = responses._1
      nextInvoice = responses._2

      first_payment_amount = nextInvoice.invoiceItems.filter(x => x.subscriptionName == newSubscription.subscriptionNumber).map(x => x.chargeAmount + x.taxAmount).sum

      _ <- SQS.sendEmail(
        message = EmailMessage(
          EmailPayload(
            Address = Some(account.billToContact.workEmail),
            ContactAttributes = EmailPayloadContactAttributes(
              SubscriberAttributes = EmailPayloadSubscriberAttributes(
                first_name = account.billToContact.firstName,
                last_name = account.billToContact.lastName,
                currency = account.basicInfo.currency.symbol,
                price = "11.99",
                first_payment_amount = first_payment_amount.toString,
                date_of_first_payment = chargedThroughDate.format(DateTimeFormatter.ofPattern("d MMMM uuuu")),
                payment_frequency = "Monthly",
                promotion = "50% off for 3 months",
                contribution_cancellation_date = chargedThroughDate.format(DateTimeFormatter.ofPattern("d MMMM uuuu")),
                subscription_id = newSubscription.subscriptionNumber
              )
            )
          ),
          "SV_RCtoDP_Switch",
          account.basicInfo.sfContactId__c,
          account.basicInfo.IdentityId__c
        )
      ).mapErrorTo500("EmailSender").fork

      if (res.totalDeltaMRR < 0) {
        <- SQS.queueRefund(RefundInput(res.totalDeltaMRR.abs, res.invoiceId)).fork
      } else {
        ZIO.succeed (())
      }

      _ <- ZIO.log("Sub: " + newSubscription.subscriptionNumber)
    } yield Success(newSubscription.subscriptionNumber)

    output.catchAll {
      failure => ZIO.succeed(failure)
    }
}
