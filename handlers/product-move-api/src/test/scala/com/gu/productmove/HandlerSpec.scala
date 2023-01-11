package com.gu.productmove

import com.gu.newproduct.api.productcatalog.{BillingPeriod, Monthly}
import com.gu.productmove.*
import com.gu.productmove.GuStageLive.Stage
import com.gu.productmove.endpoint.available.{
  AvailableProductMovesEndpoint,
  Billing,
  Currency,
  MoveToProduct,
  Offer,
  TimePeriod,
  TimeUnit,
  Trial,
}
import com.gu.productmove.endpoint.move.ProductMoveEndpoint
import com.gu.productmove.endpoint.move.ProductMoveEndpointTypes.{ExpectedInput, OutputBody}
import com.gu.productmove.endpoint.move.ProductMoveEndpointTypes
import com.gu.productmove.endpoint.available.AvailableProductMovesEndpointTypes
import com.gu.productmove.refund.RefundInput
import com.gu.productmove.salesforce.Salesforce.SalesforceRecordInput
import com.gu.productmove.zuora.GetAccount.{
  AccountSubscription,
  BasicInfo,
  BillToContact,
  GetAccountResponse,
  PaymentMethodResponse,
  ZuoraSubscription,
}
import com.gu.productmove.zuora.{
  CancellationResponse,
  CreateSubscriptionResponse,
  DefaultPaymentMethod,
  GetAccount,
  GetSubscription,
  MockCancelZuora,
  MockCatalogue,
  MockGetAccount,
  MockGetSubscription,
  MockSQS,
  MockSubscribe,
  MockSubscriptionUpdate,
  SubscriptionUpdateResponse,
}
import com.gu.productmove.zuora.GetSubscription.{GetSubscriptionResponse, RatePlan, RatePlanCharge}
import zio.*
import zio.test.*
import zio.test.Assertion.*

import java.time.{LocalDate, LocalDateTime, OffsetDateTime, ZoneOffset}
import scala.language.postfixOps

object HandlerSpec extends ZIOSpecDefault {
  def spec = {
    val time = OffsetDateTime.of(LocalDateTime.of(2022, 5, 10, 10, 2), ZoneOffset.ofHours(0)).toInstant
    val expectedSubNameInput = "A-S00339056"
    def getSubscriptionStubs(subscriptionResponse: GetSubscriptionResponse = getSubscriptionResponse) = {
      Map(expectedSubNameInput -> subscriptionResponse)
    }
    val subscriptionUpdateInputsShouldBe: (String, BillingPeriod, BigDecimal, String) =
      (expectedSubNameInput, Monthly, 50, "89ad8casd9c0asdcaj89sdc98as")
    val getAccountStubs = Map("accountNumber" -> getAccountResponse)
    val sqsStubs: Map[EmailMessage | RefundInput | SalesforceRecordInput, Unit] =
      Map(emailMessageBody -> (), salesforceRecordInput2 -> ())
    val getPaymentMethodResponse = PaymentMethodResponse(
      NumConsecutiveFailures = 0,
    )
    val getPaymentMethodStubs = Map("paymentMethodId" -> getPaymentMethodResponse)

    suite("HandlerSpec")(
      test("productMove endpoint is successful") {
        val endpointJsonInputBody = ExpectedInput(50.00, false)
        val subscriptionUpdatePreviewStubs = Map(subscriptionUpdateInputsShouldBe -> subscriptionUpdatePreviewResult)
        val subscriptionUpdateStubs = Map(subscriptionUpdateInputsShouldBe -> subscriptionUpdateResponse)
        val expectedOutput = ProductMoveEndpointTypes.Success("Product move completed successfully")
        (for {
          _ <- TestClock.setTime(time)
          output <- ProductMoveEndpoint.productMove(expectedSubNameInput, endpointJsonInputBody)
          getSubRequests <- MockGetSubscription.requests
          subUpdateRequests <- MockSubscriptionUpdate.requests
          getAccountRequests <- MockGetAccount.requests
          sqsRequests <- MockSQS.requests
        } yield {
          assert(output)(equalTo(expectedOutput)) &&
          assert(getSubRequests)(equalTo(List(expectedSubNameInput))) &&
          assert(subUpdateRequests)(equalTo(List(subscriptionUpdateInputsShouldBe))) &&
          assert(getAccountRequests)(equalTo(List("accountNumber"))) &&
          assert(sqsRequests)(hasSameElements(List(emailMessageBody, salesforceRecordInput2)))
        }).provide(
          ZLayer.succeed(new MockGetSubscription(getSubscriptionStubs())),
          ZLayer.succeed(new MockSubscriptionUpdate(subscriptionUpdatePreviewStubs, subscriptionUpdateStubs)),
          ZLayer.succeed(new MockSQS(sqsStubs)),
          ZLayer.succeed(new MockGetAccount(getAccountStubs, getPaymentMethodStubs)),
          ZLayer.succeed(Stage.valueOf("PROD")),
        )
      },
      test("productMove endpoint is successful for a refunded customer") {
        val endpointJsonInputBody = ExpectedInput(50.00, false)
        val subscriptionUpdatePreviewStubs = Map(subscriptionUpdateInputsShouldBe -> subscriptionUpdatePreviewResult)
        val subscriptionUpdateStubs = Map(subscriptionUpdateInputsShouldBe -> subscriptionUpdateResponse2)
        val expectedOutput = ProductMoveEndpointTypes.Success("Product move completed successfully")
        val sqsStubs: Map[EmailMessage | RefundInput | SalesforceRecordInput, Unit] =
          Map(emailMessageBodyRefund -> (), refundInput1 -> (), salesforceRecordInput1 -> ())
        (for {
          _ <- TestClock.setTime(time)
          output <- ProductMoveEndpoint.productMove(expectedSubNameInput, endpointJsonInputBody)
          getSubRequests <- MockGetSubscription.requests
          subUpdateRequests <- MockSubscriptionUpdate.requests
          getAccountRequests <- MockGetAccount.requests
          sqsRequests <- MockSQS.requests
        } yield {
          assert(output)(equalTo(expectedOutput)) &&
          assert(getSubRequests)(equalTo(List(expectedSubNameInput))) &&
          assert(subUpdateRequests)(equalTo(List(subscriptionUpdateInputsShouldBe))) &&
          assert(getAccountRequests)(equalTo(List("accountNumber"))) &&
          assert(sqsRequests)(hasSameElements(List(emailMessageBodyRefund, refundInput1, salesforceRecordInput1)))
        }).provide(
          ZLayer.succeed(new MockGetSubscription(getSubscriptionStubs())),
          ZLayer.succeed(new MockSubscriptionUpdate(subscriptionUpdatePreviewStubs, subscriptionUpdateStubs)),
          ZLayer.succeed(new MockSQS(sqsStubs)),
          ZLayer.succeed(new MockGetAccount(getAccountStubs, getPaymentMethodStubs)),
          ZLayer.succeed(Stage.valueOf("PROD")),
        )
      },
      test("productMove endpoint returns 500 error if subscription has more than one rateplan") {
        val endpointJsonInputBody = ExpectedInput(50.00, false)
        val subscriptionUpdatePreviewStubs = Map(subscriptionUpdateInputsShouldBe -> subscriptionUpdatePreviewResult)
        val subscriptionUpdateStubs = Map(subscriptionUpdateInputsShouldBe -> subscriptionUpdateResponse)
        val expectedOutput = "Subscription: A-S00339056 has more than one ratePlan"
        (for {
          output <- ProductMoveEndpoint.productMove(expectedSubNameInput, endpointJsonInputBody).exit
          getSubRequests <- MockGetSubscription.requests
          subUpdateRequests <- MockSubscriptionUpdate.requests
        } yield {
          assert(output)(fails(equalTo(expectedOutput))) &&
          assert(getSubRequests)(equalTo(List(expectedSubNameInput))) &&
          assert(subUpdateRequests)(equalTo(Nil))
        }).provide(
          ZLayer.succeed(new MockGetSubscription(getSubscriptionStubs(getSubscriptionResponse2))),
          ZLayer.succeed(new MockSubscriptionUpdate(subscriptionUpdatePreviewStubs, subscriptionUpdateStubs)),
          ZLayer.succeed(new MockSQS(sqsStubs)),
          ZLayer.succeed(new MockGetAccount(getAccountStubs, getPaymentMethodStubs)),
          ZLayer.succeed(Stage.valueOf("PROD")),
        )
      },
      test("preview endpoint is successful") {
        val endpointJsonInputBody = ExpectedInput(50.00, true)
        val subscriptionUpdatePreviewStubs = Map(subscriptionUpdateInputsShouldBe -> subscriptionUpdatePreviewResult)
        val subscriptionUpdateStubs = Map(subscriptionUpdateInputsShouldBe -> subscriptionUpdateResponse)
        val expectedOutput = ProductMoveEndpointTypes.PreviewResult(
          amountPayableToday = 40,
          contributionRefundAmount = -10,
          supporterPlusPurchaseAmount = 50,
        )
        (for {
          _ <- TestClock.setTime(time)
          output <- ProductMoveEndpoint.productMove(expectedSubNameInput, endpointJsonInputBody)
          getSubRequests <- MockGetSubscription.requests
          subUpdatePreviewRequests <- MockSubscriptionUpdate.requests
        } yield {
          assert(output)(equalTo(expectedOutput)) &&
          assert(getSubRequests)(equalTo(List(expectedSubNameInput))) &&
          assert(subUpdatePreviewRequests)(equalTo(List(subscriptionUpdateInputsShouldBe)))
        }).provide(
          ZLayer.succeed(new MockGetSubscription(getSubscriptionStubs())),
          ZLayer.succeed(new MockSubscriptionUpdate(subscriptionUpdatePreviewStubs, subscriptionUpdateStubs)),
          ZLayer.succeed(new MockSQS(sqsStubs)),
          ZLayer.succeed(new MockGetAccount(getAccountStubs, getPaymentMethodStubs)),
          ZLayer.succeed(Stage.valueOf("PROD")),
        )
      },
      test("available-product-moves endpoint") {
        val expectedOutput = AvailableProductMovesEndpointTypes.AvailableMoves(
          body = List(
            MoveToProduct(
              id = "2c92a0fb4edd70c8014edeaa4eae220a",
              name = "Digital Pack",
              billing = Billing(
                amount = Some(1199),
                percentage = None,
                currency = Some(Currency.GBP),
                frequency = Some(TimePeriod(TimeUnit.month, 1)),
                startDate = Some("2022-12-28"),
              ),
              trial = Some(Trial(14)),
              introOffer = Some(
                Offer(
                  Billing(
                    amount = None,
                    percentage = Some(50),
                    currency = None, // FIXME doesn't make sense for a percentage
                    frequency = None, // FIXME doesn't make sense for a percentage
                    startDate = Some("2022-09-29"),
                  ),
                  duration = TimePeriod(TimeUnit.month, 3),
                ),
              ),
            ),
          ),
        )
        (for {
          _ <- TestClock.setTime(time)
          output <- AvailableProductMovesEndpoint.runWithEnvironment(expectedSubNameInput)
          getSubRequests <- MockGetSubscription.requests
          accountRequests <- MockGetAccount.requests
        } yield {
          assert(output)(equalTo(expectedOutput)) &&
          assert(getSubRequests)(equalTo(List(expectedSubNameInput))) &&
          assert(accountRequests)(equalTo(List("accountNumber", "paymentMethodId")))
        }).provide(
          ZLayer.succeed(new MockCatalogue),
          ZLayer.succeed(new MockGetSubscription(getSubscriptionStubs())),
          ZLayer.succeed(new MockGetAccount(getAccountStubs, getPaymentMethodStubs)),
          ZLayer.succeed(Stage.valueOf("PROD")),
        )
      },
      test("available-product-moves endpoint returns empty response when user is in payment failure") {
        val getPaymentMethodResponse = PaymentMethodResponse(
          NumConsecutiveFailures = 3,
        )
        val getPaymentMethodStubs = Map("paymentMethodId" -> getPaymentMethodResponse)
        val expectedOutput = AvailableProductMovesEndpointTypes.AvailableMoves(body = List())
        (for {
          _ <- TestClock.setTime(time)
          output <- AvailableProductMovesEndpoint.runWithEnvironment(expectedSubNameInput)
          getSubRequests <- MockGetSubscription.requests
          accountRequests <- MockGetAccount.requests
        } yield {
          assert(output)(equalTo(expectedOutput)) &&
          assert(getSubRequests)(equalTo(List(expectedSubNameInput))) &&
          assert(accountRequests)(equalTo(List("accountNumber", "paymentMethodId")))
        }).provide(
          ZLayer.succeed(new MockCatalogue),
          ZLayer.succeed(new MockGetSubscription(getSubscriptionStubs())),
          ZLayer.succeed(new MockGetAccount(getAccountStubs, getPaymentMethodStubs)),
          ZLayer.succeed(Stage.valueOf("PROD")),
        )
      },
      test("available-product-moves endpoint returns empty response when user does not have a card payment method") {
        val getAccountStubs = Map("accountNumber" -> directDebitGetAccountResponse)
        val expectedOutput = AvailableProductMovesEndpointTypes.AvailableMoves(body = List())
        (for {
          _ <- TestClock.setTime(time)
          output <- AvailableProductMovesEndpoint.runWithEnvironment(expectedSubNameInput)
          getSubRequests <- MockGetSubscription.requests
          accountRequests <- MockGetAccount.requests
        } yield {
          assert(output)(equalTo(expectedOutput)) &&
          assert(getSubRequests)(equalTo(List(expectedSubNameInput))) &&
          assert(accountRequests)(equalTo(List("accountNumber")))
        }).provide(
          ZLayer.succeed(new MockCatalogue),
          ZLayer.succeed(new MockGetSubscription(getSubscriptionStubs())),
          ZLayer.succeed(new MockGetAccount(getAccountStubs, getPaymentMethodStubs)),
          ZLayer.succeed(Stage.valueOf("PROD")),
        )
      },
    )
  }
}
