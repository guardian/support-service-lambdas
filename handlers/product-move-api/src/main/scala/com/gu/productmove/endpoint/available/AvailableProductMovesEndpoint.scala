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
import zio.{URIO, IO, Clock, ZIO}
import zio.json.{DeriveJsonDecoder, DeriveJsonEncoder, JsonDecoder, JsonEncoder}

import java.time.LocalDate
import java.time.format.DateTimeFormatter
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

  // sub to test on: "A-S00334930"
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


  def getAvailableSwitchRatePlans(zuoraProductCatalogue: ZuoraProductCatalogue, ratePlanNames: List[String]): List[ZuoraProductRatePlan] =
    val productRatePlans = for {
      product <- zuoraProductCatalogue.products.filter(ratePlanNames contains _.name)
      productRatePlan <- product.productRatePlans.toList
    } yield productRatePlan

    productRatePlans.find(_.name == "Digital Pack Monthly").toList

  val localDateToString = DateTimeFormatter.ISO_LOCAL_DATE

  def succeedIfEligible(accountEligible: Boolean, message: String): ZIO[Any, Unit, Unit] =
    if (accountEligible)
      ZIO.succeed(())
    else
      for {
        _ <- ZIO.log(message)
        _ <- ZIO.fail(())
      } yield ()

  extension [R, E, A](zio: ZIO[R, E, A])
    def handleError(message: String) = zio.catchAll {
      error =>
        ZIO.log(s"$message failed with: $error").flatMap(_ => ZIO.fail(InternalServerError))
    }

  private[productmove] def runWithEnvironment(subscriptionName: String): URIO[GetSubscription with GetCatalogue with GetAccount with Stage, OutputBody] = {
    val asdf: ZIO[GetAccount with GetSubscription with GetCatalogue with Stage, OutputBody, OutputBody] = for {
      stage <- ZIO.service[Stage]
      monthlyContributionRatePlanId = if (stage == Stage.DEV) "2c92c0f85a6b134e015a7fcd9f0c7855" else "2c92a0fc5aacfadd015ad24db4ff5e97"

      _ <- ZIO.log("subscription name: " + subscriptionName)

      // Kick off catalogue fetch in parallel
      zuoraProductCatalogueFetch <- GetCatalogue.get.fork
      subscription <- GetSubscription.get(subscriptionName).handleError("GetSubscription")

      // Next payment date
      chargedThroughDate <- ZIO.fromOption(subscription.ratePlans.head.ratePlanCharges.head.chargedThroughDate).orElse {
        ZIO.log(s"chargedThroughDate is null for subscription $subscriptionName.").flatMap(_ => ZIO.fail(Success(List())))
      }

      account <- GetAccount.get(subscription.accountNumber).handleError("GetAccount")
      paymentMethod <- GetAccount.getPaymentMethod(account.basicInfo.defaultPaymentMethod.id).handleError("GetAccount.getPaymentMethod")

      today <- Clock.currentDateTime.map(_.toLocalDate)

      /*
      Only show the switch if:
        credit card is not expired (according to zuora)
        User is not in payment failure or has unpaid invoices
        Currency is GBP (initially on day 1 only?)
        Monthly contribution
        Only have one sub in the account
      */
      isEligible <-
        (for {
          _ <- succeedIfEligible(account.subscriptions.length == 1, s"More than one subscription for account for subscription: $subscriptionName")
          _ <- succeedIfEligible(subscription.ratePlans.head.productRatePlanId == monthlyContributionRatePlanId,s"Subscription: $subscriptionName is not a monthly contribution")
          _ <- succeedIfEligible(account.basicInfo.currency == "GBP", s"Subscription: $subscriptionName not in GBP")
          _ <- succeedIfEligible(paymentMethod.NumConsecutiveFailures == 0, s"User is in payment failure with subscription: $subscriptionName")
          _ <- succeedIfEligible(account.basicInfo.defaultPaymentMethod.creditCardExpirationDate.isAfter(today), s"card expired for subscription: $subscriptionName")
        } yield ()).isSuccess

      availableProductMoves <- if (isEligible) ZIO.succeed(()) else ZIO.fail(Success(List()))

      zuoraProductCatalogue <- zuoraProductCatalogueFetch.join.handleError("GetCatalogue")

      productRatePlans = getAvailableSwitchRatePlans(zuoraProductCatalogue, List("Digital Pack"))
      moveToProduct <- ZIO.foreach(productRatePlans) { productRatePlan =>
        MoveToProduct.buildResponseFromRatePlan(subscriptionName, productRatePlan, chargedThroughDate)
      }

      _ <- ZIO.log("done")
    } yield Success(moveToProduct)

    asdf.catchAll {
      failure => ZIO.succeed(failure)
    }
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
