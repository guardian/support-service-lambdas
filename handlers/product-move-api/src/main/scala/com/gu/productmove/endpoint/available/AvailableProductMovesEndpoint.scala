package com.gu.productmove.endpoint.available

import com.gu.productmove.AwsS3
import com.gu.productmove.GuStageLive.Stage
import com.gu.productmove.endpoint.available.AvailableProductMovesEndpointTypes.*
import com.gu.productmove.endpoint.available.Currency.GBP
import com.gu.productmove.framework.ZIOApiGatewayRequestHandler.TIO
import com.gu.productmove.framework.{LambdaEndpoint, ZIOApiGatewayRequestHandler}
import com.gu.productmove.zuora.GetAccount.{GetAccountResponse, PaymentMethodResponse}
import com.gu.productmove.zuora.*
import com.gu.productmove.zuora.rest.{ZuoraClientLive, ZuoraGetLive}
import com.gu.productmove.{AwsCredentialsLive, AwsS3Live, GuStageLive, SttpClientLive}
import sttp.tapir.*
import sttp.tapir.EndpointIO.Example
import sttp.tapir.EndpointOutput.StatusCode
import sttp.tapir.Schema
import sttp.tapir.json.zio.jsonBody
import zio.{IO, Clock, ZIO}
import zio.json.{DeriveJsonDecoder, DeriveJsonEncoder, JsonDecoder, JsonEncoder}

import java.time.LocalDate
import java.time.format.DateTimeFormatter
import scala.runtime.Nothing$
import scala.util.Left

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
      GetCatalogueLive.layer,
      GetAccountLive.layer,
      ZuoraGetLive.layer,
      GuStageLive.layer,
    )

  private val freeTrialDays = 14

  /*
  Only show the switch if
  § credit card is not expired (according to zuora)
  § User is not in payment failure or has unpaid invoices
  ? Currency is GBP (initially on day 1 only?)
  § Monthly contribution
  § Only have one sub in the account

  API return values
  Note, These are all wrapped in a switches structure which has a collection of switches available.  There will only be one initially as we only support RC->DS
  trial = X days (1-31 days) (may not need this, may be hard coded to 14 days)
  Payment method = xxxxxxxxx4242 + expiry from zuora or similar for DD.
  § Next payment date
  Next payment amount (hard code the 3 months half price discount in the MVP for simplicity)
  Email address to send to (may be already known on client side)
  If it fails: we just return a generic error, the call centre can help the user if necessary.

  */
  def getAvailableSwitchRatePlans(zuoraProductCatalogue: ZuoraProductCatalogue, ratePlanNames: List[String]): List[ZuoraProductRatePlan] =
    val productRatePlans = for {
      product <- zuoraProductCatalogue.products.filter(ratePlanNames contains _.name)
      productRatePlan <- product.productRatePlans.toList
    } yield productRatePlan

    productRatePlans.toList

  val localDateToString = DateTimeFormatter.BASIC_ISO_DATE

  def eligibilityCheck(accountNotEligible: Boolean, message: String): ZIO[Any, Unit, Unit] = {
    if (accountNotEligible) {
      for {
        _ <- ZIO.log(message)
        _ <- ZIO.fail(())
      } yield ()
    } else {
      ZIO.succeed(())
    }
  }

  private[productmove] def runWithEnvironment(subscriptionName: String): ZIO[GetSubscription with GetCatalogue with GetAccount, String, OutputBody] = {
    for {
      _ <- ZIO.log("subscription name: " + subscriptionName)

      // kick off catalogue fetch in parallel
      zuoraProductCatalogueFuture <- GetCatalogue.get.fork
      subscription <- GetSubscription.get(subscriptionName)

      // next payment date
      chargedThroughDate <- ZIO.fromOption(subscription.ratePlans.head.ratePlanCharges.head.chargedThroughDate).orElseFail(s"chargedThroughDate is null for subscription $subscriptionName.")

      account <- GetAccount.get(subscription.accountNumber)
      paymentMethod <- GetAccount.getPaymentMethod(account.basicInfo.defaultPaymentMethod.id)

      today <- Clock.currentDateTime.map(_.toLocalDate)

      isEligible <-
        (for {
          // more than one sub in account
          _ <- eligibilityCheck(account.subscriptions.length > 1, "more than one subscription for account")
          // sub is a monthly contribution
          _ <- eligibilityCheck(account.subscriptions.head.ratePlans.head.productRatePlanId != "monthlyContributionRatePlanId","Not a monthly contribution")
          // not in payment failure
          _ <- eligibilityCheck(paymentMethod.NumConsecutiveFailures > 0, s"In payment failure for subscription: $subscriptionName")
          // card not expired
          _ <- eligibilityCheck(account.basicInfo.defaultPaymentMethod.creditCardExpirationMonth.isBefore(today), "card expired so no product to move to")
        } yield ()).isSuccess

      availableProductMoves <- if (isEligible) {
        for {
          zuoraProductCatalogue <- zuoraProductCatalogueFuture.join

          // get rate plans to switch to and build the response objects, hardcoded for now
          productRatePlans = getAvailableSwitchRatePlans(zuoraProductCatalogue, List("Digital Pack Monthly"))
          moveToProduct <- ZIO.collectAll { productRatePlans.map(x => MoveToProduct.buildResponseFromRatePlan(subscriptionName, x, chargedThroughDate)) }
        } yield moveToProduct
      } else {
        ZIO.succeed(List())
      }

      _ <- ZIO.log("done")
    } yield Success(availableProductMoves)
  }
}

/*
object AvailableSwitches:

  private val moveToDigitalSub = MoveToProduct(
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
        currency = Currency.GBP, //FIXME doesn't make sense for a percentage
        frequency = None, //FIXME doesn't make sense for a percentage
        startDate = Some("2022-09-21")
      ),
      duration = TimePeriod(TimeUnit.month, 3)
    )))

}

*/
