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
import com.gu.productmove.endpoint.move.ProductMoveEndpointTypes.{ExpectedInput, InternalServerError, OutputBody}
import com.gu.productmove.endpoint.move.ProductMoveEndpointTypes
import com.gu.productmove.endpoint.available.AvailableProductMovesEndpointTypes
import com.gu.productmove.endpoint.cancel.{SubscriptionCancelEndpoint, SubscriptionCancelEndpointTypes}
import com.gu.productmove.invoicingapi.InvoicingApiRefund
import com.gu.productmove.invoicingapi.InvoicingApiRefund.RefundResponse
import com.gu.productmove.mocks.MockInvoicingApiRefund
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
  GetCatalogue,
  GetSubscription,
  MockCatalogue,
  MockDynamo,
  MockGetAccount,
  MockGetSubscription,
  MockGetSubscriptionToCancel,
  MockSQS,
  MockSubscribe,
  MockSubscriptionUpdate,
  MockZuoraCancel,
  MockZuoraSetCancellationReason,
  SubscriptionUpdateResponse,
  UpdateResponse,
}
import com.gu.productmove.zuora.GetSubscription.{GetSubscriptionResponse, RatePlan, RatePlanCharge}
import com.gu.productmove.zuora.model.{AccountNumber, SubscriptionName}
import zio.*
import zio.test.*
import zio.test.Assertion.*

import java.time.{LocalDate, LocalDateTime, OffsetDateTime, ZoneOffset}
import scala.language.postfixOps

object HandlerSpec extends ZIOSpecDefault {
  def spec = {
    val time = OffsetDateTime.of(LocalDateTime.of(2022, 5, 10, 10, 2), ZoneOffset.ofHours(0)).toInstant
    val subscriptionName = SubscriptionName("A-S00339056")

    def getSubscriptionStubs(subscriptionResponse: GetSubscriptionResponse = getSubscriptionResponse) = {
      Map(subscriptionName -> subscriptionResponse)
    }

    val subscriptionUpdateInputsShouldBe: (SubscriptionName, BillingPeriod, BigDecimal, String) =
      (subscriptionName, Monthly, BigDecimal(15), "89ad8casd9c0asdcaj89sdc98as")
    val getAccountStubs = Map(AccountNumber("accountNumber") -> getAccountResponse)
    val getAccountStubs2 = Map(AccountNumber("accountNumber") -> getAccountResponse2)
    val sqsStubs: Map[EmailMessage | RefundInput | SalesforceRecordInput, Unit] =
      Map(emailMessageBody -> (), salesforceRecordInput2 -> ())
    val dynamoStubs = Map(supporterRatePlanItem1 -> ())
    val getPaymentMethodResponse = PaymentMethodResponse(
      NumConsecutiveFailures = 0,
    )
    val getPaymentMethodStubs = Map("paymentMethodId" -> getPaymentMethodResponse)

    suite("HandlerSpec")(
      test("productMove endpoint is successful for monthly sub (upsell)") {
        val endpointJsonInputBody = ExpectedInput(15.00, false, None, None)
        val subscriptionUpdatePreviewStubs = Map(subscriptionUpdateInputsShouldBe -> subscriptionUpdatePreviewResult)
        val subscriptionUpdateStubs = Map(subscriptionUpdateInputsShouldBe -> subscriptionUpdateResponse)
        val expectedOutput = ProductMoveEndpointTypes.Success("Product move completed successfully")
        (for {
          _ <- TestClock.setTime(time)
          output <- ProductMoveEndpoint.productMove(subscriptionName, endpointJsonInputBody)
          getSubRequests <- MockGetSubscription.requests
          subUpdateRequests <- MockSubscriptionUpdate.requests
          getAccountRequests <- MockGetAccount.requests
          sqsRequests <- MockSQS.requests
          dynamoRequests <- MockDynamo.requests
        } yield {
          assert(output)(equalTo(expectedOutput)) &&
          assert(getSubRequests)(equalTo(List(subscriptionName))) &&
          assert(subUpdateRequests)(equalTo(List(subscriptionUpdateInputsShouldBe))) &&
          assert(getAccountRequests)(equalTo(List(AccountNumber("accountNumber")))) &&
          assert(sqsRequests)(hasSameElements(List(emailMessageBody, salesforceRecordInput2))) &&
          assert(dynamoRequests)(equalTo(List(supporterRatePlanItem1)))
        }).provide(
          ZLayer.succeed(new MockGetSubscription(getSubscriptionStubs())),
          ZLayer.succeed(new MockSubscriptionUpdate(subscriptionUpdatePreviewStubs, subscriptionUpdateStubs)),
          ZLayer.succeed(new MockSQS(sqsStubs)),
          ZLayer.succeed(new MockDynamo(dynamoStubs)),
          ZLayer.succeed(new MockGetAccount(getAccountStubs, getPaymentMethodStubs)),
          ZLayer.succeed(Stage.valueOf("PROD")),
        )
      },
      test(
        "productMove endpoint is successful if customer neither pays nor is refunded on switch (monthly sub, upsell)",
      ) {
        val endpointJsonInputBody = ExpectedInput(15.00, false, None, None)
        val subscriptionUpdatePreviewStubs = Map(subscriptionUpdateInputsShouldBe -> subscriptionUpdatePreviewResult)
        val subscriptionUpdateStubs = Map(subscriptionUpdateInputsShouldBe -> subscriptionUpdateResponse3)
        val expectedOutput = ProductMoveEndpointTypes.Success("Product move completed successfully")
        val sqsStubs: Map[EmailMessage | RefundInput | SalesforceRecordInput, Unit] =
          Map(emailMessageBodyNoPaymentOrRefund -> (), salesforceRecordInput3 -> ())

        val layers = ZLayer.succeed(new MockGetSubscription(getSubscriptionStubs())) ++
          ZLayer.succeed(new MockSubscriptionUpdate(subscriptionUpdatePreviewStubs, subscriptionUpdateStubs)) ++
          ZLayer.succeed(new MockSQS(sqsStubs)) ++
          ZLayer.succeed(new MockDynamo(dynamoStubs)) ++
          ZLayer.succeed(new MockGetAccount(getAccountStubs, getPaymentMethodStubs)) ++
          ZLayer.succeed(Stage.valueOf("PROD"))

        (for {
          _ <- TestClock.setTime(time)

          output <- ProductMoveEndpoint.productMove(subscriptionName, endpointJsonInputBody)
          getSubRequests <- MockGetSubscription.requests
          subUpdateRequests <- MockSubscriptionUpdate.requests
          getAccountRequests <- MockGetAccount.requests
          sqsRequests <- MockSQS.requests
          dynamoRequests <- MockDynamo.requests
        } yield {
          assert(output)(equalTo(expectedOutput)) &&
          assert(getSubRequests)(equalTo(List(subscriptionName))) &&
          assert(subUpdateRequests)(equalTo(List(subscriptionUpdateInputsShouldBe))) &&
          assert(getAccountRequests)(equalTo(List(AccountNumber("accountNumber")))) &&
          assert(sqsRequests)(hasSameElements(List(emailMessageBodyNoPaymentOrRefund, salesforceRecordInput3))) &&
          assert(dynamoRequests)(equalTo(List(supporterRatePlanItem1)))
        }).provide(layers)
      },
      test("productMove endpoint returns 500 error if identityId does not exist") {
        val endpointJsonInputBody = ExpectedInput(50.00, false, None, None)
        val subscriptionUpdatePreviewStubs = Map(subscriptionUpdateInputsShouldBe -> subscriptionUpdatePreviewResult)
        val subscriptionUpdateStubs = Map(subscriptionUpdateInputsShouldBe -> subscriptionUpdateResponse)
        val expectedOutput = InternalServerError("identityId is null for subscription name A-S00339056")
        (for {
          _ <- TestClock.setTime(time)
          output <- ProductMoveEndpoint.productMove(subscriptionName, endpointJsonInputBody)
          getSubRequests <- MockGetSubscription.requests
          subUpdateRequests <- MockSubscriptionUpdate.requests
          getAccountRequests <- MockGetAccount.requests
          sqsRequests <- MockSQS.requests
          dynamoRequests <- MockDynamo.requests
        } yield {
          assert(output)(equalTo(expectedOutput)) &&
          assert(getSubRequests)(equalTo(List(SubscriptionName("A-S00339056")))) &&
          assert(subUpdateRequests)(equalTo(Nil)) &&
          assert(getAccountRequests)(equalTo(List(AccountNumber("accountNumber")))) &&
          assert(sqsRequests)(equalTo(Nil)) &&
          assert(dynamoRequests)(equalTo(Nil))
        }).provide(
          ZLayer.succeed(new MockGetSubscription(getSubscriptionStubs())),
          ZLayer.succeed(new MockSubscriptionUpdate(subscriptionUpdatePreviewStubs, subscriptionUpdateStubs)),
          ZLayer.succeed(new MockSQS(sqsStubs)),
          ZLayer.succeed(new MockDynamo(dynamoStubs)),
          ZLayer.succeed(new MockGetAccount(getAccountStubs2, getPaymentMethodStubs)),
          ZLayer.succeed(Stage.valueOf("PROD")),
        )
      },
      test("productMove endpoint returns 500 error if subscription has more than one rateplan") {
        val endpointJsonInputBody = ExpectedInput(50.00, false, None, None)
        val subscriptionUpdatePreviewStubs = Map(subscriptionUpdateInputsShouldBe -> subscriptionUpdatePreviewResult)
        val subscriptionUpdateStubs = Map(subscriptionUpdateInputsShouldBe -> subscriptionUpdateResponse)
        val expectedOutput = InternalServerError("Subscription: A-S00339056 has more than one ratePlan")
        (for {
          output <- ProductMoveEndpoint.productMove(subscriptionName, endpointJsonInputBody)
          getSubRequests <- MockGetSubscription.requests
          subUpdateRequests <- MockSubscriptionUpdate.requests
          getAccountRequests <- MockGetAccount.requests
          sqsRequests <- MockSQS.requests
          dynamoRequests <- MockDynamo.requests
        } yield {
          assert(output)(equalTo(expectedOutput)) &&
          assert(getSubRequests)(equalTo(List(subscriptionName))) &&
          assert(subUpdateRequests)(equalTo(Nil)) &&
          assert(getAccountRequests)(equalTo(Nil)) &&
          assert(sqsRequests)(equalTo(Nil)) &&
          assert(dynamoRequests)(equalTo(Nil))
        }).provide(
          ZLayer.succeed(new MockGetSubscription(getSubscriptionStubs(getSubscriptionResponse2))),
          ZLayer.succeed(new MockSubscriptionUpdate(subscriptionUpdatePreviewStubs, subscriptionUpdateStubs)),
          ZLayer.succeed(new MockSQS(sqsStubs)),
          ZLayer.succeed(new MockDynamo(dynamoStubs)),
          ZLayer.succeed(new MockGetAccount(getAccountStubs, getPaymentMethodStubs)),
          ZLayer.succeed(Stage.valueOf("PROD")),
        )
      },

      /*
        Term renewal for many subs happens during the billing run on the renewal day which is scheduled for around 6am BST.
        During this billing run, Zuora does not return the contribution invoice item, only supporter plus invoice items.
        This tests this scenario.
       */

      test("productMove endpoint completes if subscription is being switched early in morning on renewal date") {
        val endpointJsonInputBody = ExpectedInput(50.00, false, None, None)
        val subscriptionUpdatePreviewStubs = Map(subscriptionUpdateInputsShouldBe -> subscriptionUpdatePreviewResult)
        val subscriptionUpdateStubs = Map(subscriptionUpdateInputsShouldBe -> subscriptionUpdateResponse)
        val expectedOutput = InternalServerError("Subscription: A-S00339056 has more than one ratePlan")
        (for {
          output <- ProductMoveEndpoint.productMove(subscriptionName, endpointJsonInputBody)
          getSubRequests <- MockGetSubscription.requests
          subUpdateRequests <- MockSubscriptionUpdate.requests
          getAccountRequests <- MockGetAccount.requests
          sqsRequests <- MockSQS.requests
          dynamoRequests <- MockDynamo.requests
        } yield {
          assert(output)(equalTo(expectedOutput)) &&
          assert(getSubRequests)(equalTo(List(subscriptionName))) &&
          assert(subUpdateRequests)(equalTo(Nil)) &&
          assert(getAccountRequests)(equalTo(Nil)) &&
          assert(sqsRequests)(equalTo(Nil)) &&
          assert(dynamoRequests)(equalTo(Nil))
        }).provide(
          ZLayer.succeed(new MockGetSubscription(getSubscriptionStubs(getSubscriptionResponse2))),
          ZLayer.succeed(new MockSubscriptionUpdate(subscriptionUpdatePreviewStubs, subscriptionUpdateStubs)),
          ZLayer.succeed(new MockSQS(sqsStubs)),
          ZLayer.succeed(new MockDynamo(dynamoStubs)),
          ZLayer.succeed(new MockGetAccount(getAccountStubs, getPaymentMethodStubs)),
          ZLayer.succeed(Stage.valueOf("PROD")),
        )
      },
      test("preview endpoint is successful (monthly sub, upsell)") {
        val endpointJsonInputBody = ExpectedInput(15.00, true, None, None)
        val subscriptionUpdatePreviewStubs = Map(subscriptionUpdateInputsShouldBe -> subscriptionUpdatePreviewResult)
        val subscriptionUpdateStubs = Map(subscriptionUpdateInputsShouldBe -> subscriptionUpdateResponse)
        val expectedOutput = ProductMoveEndpointTypes.PreviewResult(
          amountPayableToday = 40,
          contributionRefundAmount = -10,
          supporterPlusPurchaseAmount = 50,
          LocalDate.of(2023, 6, 10),
        )
        (for {
          _ <- TestClock.setTime(time)
          output <- ProductMoveEndpoint.productMove(subscriptionName, endpointJsonInputBody)
          getSubRequests <- MockGetSubscription.requests
          subUpdatePreviewRequests <- MockSubscriptionUpdate.requests
        } yield {
          assert(output)(equalTo(expectedOutput)) &&
          assert(getSubRequests)(equalTo(List(subscriptionName))) &&
          assert(subUpdatePreviewRequests)(equalTo(List(subscriptionUpdateInputsShouldBe)))
        }).provide(
          ZLayer.succeed(new MockGetSubscription(getSubscriptionStubs())),
          ZLayer.succeed(new MockSubscriptionUpdate(subscriptionUpdatePreviewStubs, subscriptionUpdateStubs)),
          ZLayer.succeed(new MockSQS(sqsStubs)),
          ZLayer.succeed(new MockDynamo(dynamoStubs)),
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
          output <- AvailableProductMovesEndpoint.runWithEnvironment(subscriptionName)
          getSubRequests <- MockGetSubscription.requests
          accountRequests <- MockGetAccount.requests
        } yield {
          assert(output)(equalTo(expectedOutput)) &&
          assert(getSubRequests)(equalTo(List(subscriptionName))) &&
          assert(accountRequests)(equalTo(List(AccountNumber("accountNumber"), "paymentMethodId")))
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
          output <- AvailableProductMovesEndpoint.runWithEnvironment(subscriptionName)
          getSubRequests <- MockGetSubscription.requests
          accountRequests <- MockGetAccount.requests
        } yield {
          assert(output)(equalTo(expectedOutput)) &&
          assert(getSubRequests)(equalTo(List(subscriptionName))) &&
          assert(accountRequests)(equalTo(List(AccountNumber("accountNumber"), "paymentMethodId")))
        }).provide(
          ZLayer.succeed(new MockCatalogue),
          ZLayer.succeed(new MockGetSubscription(getSubscriptionStubs())),
          ZLayer.succeed(new MockGetAccount(getAccountStubs, getPaymentMethodStubs)),
          ZLayer.succeed(Stage.valueOf("PROD")),
        )
      },
      test("available-product-moves endpoint returns empty response when user does not have a card payment method") {
        val getAccountStubs = Map(AccountNumber("accountNumber") -> directDebitGetAccountResponse)
        val expectedOutput = AvailableProductMovesEndpointTypes.AvailableMoves(body = List())
        (for {
          _ <- TestClock.setTime(time)
          output <- AvailableProductMovesEndpoint.runWithEnvironment(subscriptionName)
          getSubRequests <- MockGetSubscription.requests
          accountRequests <- MockGetAccount.requests
        } yield {
          assert(output)(equalTo(expectedOutput)) &&
          assert(getSubRequests)(equalTo(List(subscriptionName))) &&
          assert(accountRequests)(equalTo(List(AccountNumber("accountNumber"))))
        }).provide(
          ZLayer.succeed(new MockCatalogue),
          ZLayer.succeed(new MockGetSubscription(getSubscriptionStubs())),
          ZLayer.succeed(new MockGetAccount(getAccountStubs, getPaymentMethodStubs)),
          ZLayer.succeed(Stage.valueOf("PROD")),
        )
      },
      test("cancel endpoint successfully cancels a subscription") {
        val emailMessage = EmailMessage(
          EmailPayload(
            Address = Some("example@gmail.com"),
            ContactAttributes = EmailPayloadContactAttributes(
              SubscriberAttributes = EmailPayloadCancellationAttributes(
                first_name = "John",
                last_name = "Hee",
                product_type = "Supporter Plus",
                cancellation_effective_date = Some("29 September 2022"),
              ),
            ),
          ),
          DataExtensionName = "subscription-cancelled-email",
          SfContactId = "sfContactId",
          IdentityUserId = Some("12345"),
        )
        (for {
          _ <- TestClock.setTime(time)
          input = SubscriptionCancelEndpointTypes.ExpectedInput("mma_other")
          output <- SubscriptionCancelEndpoint.subscriptionCancel(subscriptionName, input)
          getSubscriptionToCancelRequests <- MockGetSubscriptionToCancel.requests
          zuoraCancelRequests <- MockZuoraCancel.requests
          sqsRequests <- MockSQS.requests
          getAccountRequests <- MockGetAccount.requests
        } yield {
          assert(output)(equalTo(SubscriptionCancelEndpointTypes.Success("Subscription was successfully cancelled"))) &&
          assert(getSubscriptionToCancelRequests)(equalTo(List(subscriptionName))) &&
          assert(zuoraCancelRequests)(equalTo(List((subscriptionName, LocalDate.of(2022, 9, 29))))) &&
          assert(getAccountRequests)(hasSameElements(List(AccountNumber("anAccountNumber"))))
          assert(sqsRequests)(hasSameElements(List(emailMessage)))
        }).provide(
          ZLayer.succeed(new MockGetSubscriptionToCancel(Map(subscriptionName -> getSubscriptionForCancelResponse))),
          ZLayer.succeed(
            new MockZuoraCancel(
              Map(
                (subscriptionName, LocalDate.of(2022, 9, 29)) ->
                  CancellationResponse(subscriptionName.value, LocalDate.of(2022, 9, 29), None),
              ),
            ),
          ),
          ZLayer.succeed(new MockGetAccount(Map(AccountNumber("anAccountNumber") -> getAccountResponse), Map.empty)),
          ZLayer.succeed(new MockSQS(Map(emailMessage -> ()))),
          ZLayer.succeed(
            new MockZuoraSetCancellationReason(
              Map((SubscriptionName("A-S00339056"), 2, "mma_other") -> UpdateResponse(true)),
            ),
          ),
          ZLayer.succeed(Stage.valueOf("PROD")),
        )
      },
    )
  }
}
