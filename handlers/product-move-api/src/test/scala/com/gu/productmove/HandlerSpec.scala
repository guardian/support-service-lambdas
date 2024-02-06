package com.gu.productmove

import com.gu.productmove.*
import com.gu.productmove.GuStageLive.Stage
import com.gu.productmove.GuStageLive.Stage.{CODE, PROD}
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
import com.gu.productmove.endpoint.move.ProductMoveEndpointTypes
import com.gu.productmove.endpoint.move.ProductMoveEndpointTypes.{
  ExpectedInput,
  InternalServerError,
  OutputBody,
  PreviewResult,
}
import com.gu.productmove.endpoint.available.AvailableProductMovesEndpointTypes
import com.gu.productmove.endpoint.cancel.{
  SubscriptionCancelEndpoint,
  SubscriptionCancelEndpointSteps,
  SubscriptionCancelEndpointTypes,
}
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
  AddRatePlan,
  CancellationResponse,
  ChargeOverrides,
  CreatePaymentResponse,
  CreateSubscriptionResponse,
  DefaultPaymentMethod,
  GetAccount,
  GetCatalogue,
  GetSubscription,
  MockCatalogue,
  MockCreatePayment,
  MockDynamo,
  MockGetAccount,
  MockGetInvoice,
  MockGetInvoiceItems,
  MockGetSubscription,
  MockGetSubscriptionToCancel,
  MockInvoiceItemAdjustment,
  MockSQS,
  MockSubscribe,
  MockSubscriptionUpdate,
  MockTermRenewal,
  MockZuoraCancel,
  MockZuoraSetCancellationReason,
  RemoveRatePlan,
  RenewalResponse,
  SubscriptionUpdatePreviewResponse,
  SubscriptionUpdateRequest,
  SubscriptionUpdateResponse,
  UpdateResponse,
}
import com.gu.productmove.zuora.GetSubscription.{GetSubscriptionResponse, RatePlan, RatePlanCharge}
import com.gu.productmove.zuora.InvoiceItemAdjustment.InvoiceItemAdjustmentResult
import com.gu.productmove.zuora.model.{AccountNumber, SubscriptionId, SubscriptionName}
import com.gu.supporterdata.model.SupporterRatePlanItem
import com.gu.newproduct.api.productcatalog.ZuoraIds.ProductRatePlanId
import com.gu.newproduct.api.productcatalog.{BillingPeriod, Monthly}
import com.gu.productmove.endpoint.move.switchtype.{
  GetRatePlans,
  RecurringContributionToSupporterPlus,
  RecurringContributionToSupporterPlusImpl,
  ToRecurringContribution,
  ToRecurringContributionImpl,
}
import zio.*
import zio.test.*
import zio.test.Assertion.*

import java.time.{LocalDate, LocalDateTime, OffsetDateTime, ZoneOffset}
import scala.language.postfixOps

object HandlerSpec extends ZIOSpecDefault {

  def spec = {
    val time = OffsetDateTime.of(LocalDateTime.of(2022, 5, 10, 10, 2), ZoneOffset.ofHours(0)).toInstant
    val time2 = OffsetDateTime.of(LocalDateTime.of(2023, 2, 6, 10, 2), ZoneOffset.ofHours(0)).toInstant
    val time3 = OffsetDateTime.of(LocalDateTime.of(2021, 2, 15, 5, 2), ZoneOffset.ofHours(0)).toInstant
    val subscriptionName = SubscriptionName("A-S00339056")

    def getSubscriptionStubs(subscriptionResponse: GetSubscriptionResponse = getSubscriptionResponse) = {
      Map(subscriptionName -> subscriptionResponse)
    }

    val subscriptionUpdateInputsShouldBe: (SubscriptionName, SubscriptionUpdateRequest) =
      (subscriptionName, expectedRequestBody)
    val subscriptionUpdatePreviewInputsShouldBe: (SubscriptionName, SubscriptionUpdateRequest) =
      (subscriptionName, expectedRequestBodyPreview2)
    val subscriptionUpdatePreviewStubs = Map(subscriptionUpdatePreviewInputsShouldBe -> previewResponse2)
    val subscriptionUpdateStubs = Map(subscriptionUpdateInputsShouldBe -> subscriptionUpdateResponse)
    val termRenewalInputsShouldBe: SubscriptionName =
      SubscriptionName("subscription_name")
    val termRenewalResponse = RenewalResponse(Some(true), Some("invoiceId"))
    val termRenewalStubs = Map(termRenewalInputsShouldBe -> termRenewalResponse)
    val getAccountStubs = Map(AccountNumber("accountNumber") -> getAccountResponse)
    val getAccountStubs2 = Map(AccountNumber("accountNumber") -> getAccountResponse2)
    val sqsStubs: Map[EmailMessage | RefundInput | SalesforceRecordInput, Unit] =
      Map(emailMessageBody -> (), salesforceRecordInput2 -> ())
    val dynamoStubs = Map(supporterRatePlanItem1 -> ())
    val getPaymentMethodResponse = PaymentMethodResponse(
      NumConsecutiveFailures = 0,
    )
    val getPaymentMethodStubs = Map("paymentMethodId" -> getPaymentMethodResponse)
    val invoiceItemAdjustmentInputs = ("89ad8casd9c0asdcaj89sdc98as", BigDecimal(0.30), "invoice_item_id", "Credit")
    val invoiceItemAdjustmentStubs = Map(
      invoiceItemAdjustmentInputs -> List(InvoiceItemAdjustmentResult(true, "source_id")),
    )
    val getInvoiceItemsStubs = Map("89ad8casd9c0asdcaj89sdc98as" -> getInvoiceItemsResponse)
    val getInvoiceStubs = Map("89ad8casd9c0asdcaj89sdc98as" -> getInvoiceResponse)

    suite("HandlerSpec")(
      test("productMove endpoint completes switch when charge amount is below 50 cents") {
        val endpointJsonInputBody = ExpectedInput(15.00, false, None, None)
        val expectedOutput = ProductMoveEndpointTypes.Success(
          "Product move completed successfully with subscription number A-S00339056 and switch type recurring-contribution-to-supporter-plus",
        )
        val subscriptionUpdatePreviewStubs = Map(subscriptionUpdatePreviewInputsShouldBe -> previewResponse3)
        val subscriptionUpdateInputsShouldBe: (SubscriptionName, SubscriptionUpdateRequest) =
          (subscriptionName, expectedRequestBodyLowCharge)
        val subscriptionUpdateStubs = Map(subscriptionUpdateInputsShouldBe -> subscriptionUpdateResponse)
        val sqsStubs: Map[EmailMessage | RefundInput | SalesforceRecordInput, Unit] =
          Map(emailMessageLowCharge -> (), salesforceRecordInput4 -> ())
        val dynamoStubs = Map(supporterRatePlanItem2 -> ())

        val mockSubscriptionUpdate = new MockSubscriptionUpdate(subscriptionUpdatePreviewStubs, subscriptionUpdateStubs)
        val mockGetInvoiceItems = new MockGetInvoiceItems(getInvoiceItemsStubs)
        val mockSQS = new MockSQS(sqsStubs)
        val mockInvoiceItemAdjustment = new MockInvoiceItemAdjustment(invoiceItemAdjustmentStubs)
        val mockDynamo = new MockDynamo(dynamoStubs)
        for {
          _ <- TestClock.setTime(time3)
          output <- new RecurringContributionToSupporterPlusImpl(
            new GetRatePlans(
              CODE,
              new MockCatalogue(),
            ),
            mockSubscriptionUpdate,
            new MockTermRenewal(termRenewalStubs),
            mockGetInvoiceItems,
            new MockGetInvoice(getInvoiceStubs),
            new MockCreatePayment(CreatePaymentResponse(Some(true))),
            mockInvoiceItemAdjustment,
            mockSQS,
            mockDynamo,
          ).run(
            subscriptionName,
            endpointJsonInputBody,
            getSubscriptionResponse,
            getAccountResponse,
          )
        } yield {
          assert(output)(equalTo(expectedOutput)) &&
          assert(mockSubscriptionUpdate.requests)(
            equalTo(List(subscriptionUpdatePreviewInputsShouldBe, subscriptionUpdateInputsShouldBe)),
          ) &&
          assert(mockGetInvoiceItems.requests)(equalTo(List("89ad8casd9c0asdcaj89sdc98as"))) &&
          assert(mockInvoiceItemAdjustment.requests)(equalTo(List(invoiceItemAdjustmentInputs))) &&
          assert(mockSQS.requests)(hasSameElements(List(emailMessageLowCharge, salesforceRecordInput4))) &&
          assert(mockDynamo.requests)(equalTo(List(supporterRatePlanItem2)))
        }
      } @@ TestAspect.ignore,
      test("productMove endpoint is successful for monthly sub (upsell)") {
        val endpointJsonInputBody = ExpectedInput(15.00, false, None, None)
        val expectedOutput = ProductMoveEndpointTypes.Success(
          "Product move completed successfully with subscription number A-S00339056 and switch type recurring-contribution-to-supporter-plus",
        )

        val mockSubscriptionUpdate = new MockSubscriptionUpdate(subscriptionUpdatePreviewStubs, subscriptionUpdateStubs)
        val mockGetInvoiceItems = new MockGetInvoiceItems(getInvoiceItemsStubs)
        val mockSQS = new MockSQS(sqsStubs)
        val mockInvoiceItemAdjustment = new MockInvoiceItemAdjustment(invoiceItemAdjustmentStubs)
        val mockDynamo = new MockDynamo(dynamoStubs)
        for {
          _ <- TestClock.setTime(time)
          output <- new RecurringContributionToSupporterPlusImpl(
            new GetRatePlans(
              PROD,
              new MockCatalogue(),
            ),
            mockSubscriptionUpdate,
            new MockTermRenewal(termRenewalStubs),
            mockGetInvoiceItems,
            new MockGetInvoice(getInvoiceStubs),
            new MockCreatePayment(CreatePaymentResponse(Some(true))),
            mockInvoiceItemAdjustment,
            mockSQS,
            mockDynamo,
          ).run(
            subscriptionName,
            endpointJsonInputBody,
            getSubscriptionResponse,
            getAccountResponse,
          )
        } yield {
          assert(output)(equalTo(expectedOutput)) &&
          assert(mockSubscriptionUpdate.requests)(equalTo(List(subscriptionUpdateInputsShouldBe))) &&
          assert(mockSQS.requests)(hasSameElements(List(emailMessageBody, salesforceRecordInput2))) &&
          assert(mockDynamo.requests)(equalTo(List(supporterRatePlanItem1)))
        }
      } @@ TestAspect.ignore,
      test(
        "productMove endpoint is successful if customer neither pays nor is refunded on switch (monthly sub, upsell)",
      ) {
        val endpointJsonInputBody = ExpectedInput(15.00, false, None, None)
        val subscriptionUpdateStubs = Map(subscriptionUpdateInputsShouldBe -> subscriptionUpdateResponse3)
        val expectedOutput = ProductMoveEndpointTypes.Success(
          "Product move completed successfully with subscription number A-S00339056 and switch type recurring-contribution-to-supporter-plus",
        )
        val sqsStubs: Map[EmailMessage | RefundInput | SalesforceRecordInput, Unit] =
          Map(emailMessageBodyNoPaymentOrRefund -> (), salesforceRecordInput3 -> ())

        val mockSubscriptionUpdate = new MockSubscriptionUpdate(subscriptionUpdatePreviewStubs, subscriptionUpdateStubs)
        val mockGetInvoiceItems = new MockGetInvoiceItems(getInvoiceItemsStubs)
        val mockSQS = new MockSQS(sqsStubs)
        val mockInvoiceItemAdjustment = new MockInvoiceItemAdjustment(invoiceItemAdjustmentStubs)
        val mockDynamo = new MockDynamo(dynamoStubs)
        (for {
          _ <- TestClock.setTime(time)

          output <- new RecurringContributionToSupporterPlusImpl(
            new GetRatePlans(
              PROD,
              new MockCatalogue(),
            ),
            mockSubscriptionUpdate,
            new MockTermRenewal(termRenewalStubs),
            mockGetInvoiceItems,
            new MockGetInvoice(getInvoiceStubs),
            new MockCreatePayment(CreatePaymentResponse(Some(true))),
            mockInvoiceItemAdjustment,
            mockSQS,
            mockDynamo,
          ).run(
            subscriptionName,
            endpointJsonInputBody,
            getSubscriptionResponse,
            getAccountResponse,
          )
        } yield {
          assert(output)(equalTo(expectedOutput)) &&
          assert(mockSubscriptionUpdate.requests)(equalTo(List(subscriptionUpdateInputsShouldBe))) &&
          assert(mockSQS.requests)(hasSameElements(List(emailMessageBodyNoPaymentOrRefund, salesforceRecordInput3))) &&
          assert(mockDynamo.requests)(equalTo(List(supporterRatePlanItem1)))
        })
      } @@ TestAspect.ignore,
      /*
        Term renewal for many subs happens during the billing run on the renewal day which is scheduled for around 6am BST.
        During this billing run, Zuora does not return the contribution invoice item, only supporter plus invoice items.
        This tests this scenario.
       */

      test("productMove endpoint completes if subscription is being switched early in morning on renewal date") {
        val endpointJsonInputBody = ExpectedInput(15.00, true, None, None)
        val subscriptionUpdatePreviewStubs = Map(subscriptionUpdatePreviewInputsShouldBe -> previewResponse2)

        val mockSubscriptionUpdate = new MockSubscriptionUpdate(subscriptionUpdatePreviewStubs, subscriptionUpdateStubs)
        val mockGetInvoiceItems = new MockGetInvoiceItems(getInvoiceItemsStubs)
        val mockSQS = new MockSQS(sqsStubs)
        val mockInvoiceItemAdjustment = new MockInvoiceItemAdjustment(invoiceItemAdjustmentStubs)
        val mockDynamo = new MockDynamo(dynamoStubs)
        (for {
          _ <- TestClock.setTime(time3)
          output <- new RecurringContributionToSupporterPlusImpl(
            new GetRatePlans(
              CODE,
              new MockCatalogue(),
            ),
            mockSubscriptionUpdate,
            new MockTermRenewal(termRenewalStubs),
            mockGetInvoiceItems,
            new MockGetInvoice(getInvoiceStubs),
            new MockCreatePayment(CreatePaymentResponse(Some(true))),
            mockInvoiceItemAdjustment,
            mockSQS,
            mockDynamo,
          ).run(
            subscriptionName,
            endpointJsonInputBody,
            getSubscriptionResponse,
            getAccountResponse,
          )
        } yield {
          assert(output)(equalTo(subscriptionUpdatePreviewResult2)) &&
          assert(mockSubscriptionUpdate.requests)(equalTo(List(subscriptionUpdatePreviewInputsShouldBe))) &&
          assert(mockSQS.requests)(equalTo(Nil)) &&
          assert(mockDynamo.requests)(equalTo(Nil))
        })
      } @@ TestAspect.ignore, // TODO: make the code which fetches the catalog price a dependency so it can be mocked
      test(
        "(MembershipToRecurringContribution) productMove endpoint is successful",
      ) {
        val endpointJsonInputBody = ExpectedInput(5.00, false, None, None)
        val subscriptionUpdateInputsShouldBe: (SubscriptionName, SubscriptionUpdateRequest) =
          (subscriptionName, expectedRequestBody2)
        val subscriptionUpdateStubs = Map(subscriptionUpdateInputsShouldBe -> subscriptionUpdateResponse3)
        val expectedOutput = ProductMoveEndpointTypes.Success(
          "Product move completed successfully with subscription number A-S00339056 and switch type to-recurring-contribution",
        )
        val sqsStubs: Map[EmailMessage | RefundInput | SalesforceRecordInput, Unit] =
          Map(emailMessageBody2 -> (), salesforceRecordInput1 -> ())

        val mockSubscriptionUpdate = new MockSubscriptionUpdate(subscriptionUpdatePreviewStubs, subscriptionUpdateStubs)
        val mockSQS = new MockSQS(sqsStubs)

        (for {
          _ <- TestClock.setTime(time)

          output <- new ToRecurringContributionImpl(
            mockSubscriptionUpdate,
            mockSQS,
            PROD,
          ).run(
            subscriptionName,
            endpointJsonInputBody,
            getSubscriptionResponse,
            getAccountResponse,
          )
        } yield {
          assert(output)(equalTo(expectedOutput)) &&
          assert(mockSubscriptionUpdate.requests)(equalTo(List(subscriptionUpdateInputsShouldBe))) &&
          assert(mockSQS.requests)(hasSameElements(List(emailMessageBody2, salesforceRecordInput1)))
        })
      } @@ TestAspect.ignore, // TODO: make the code which fetches the catalog price a dependency so it can be mocked

      test("productMove endpoint returns 500 error if identityId does not exist") {
        val endpointJsonInputBody = ExpectedInput(15.00, false, None, None)
        val subscriptionUpdateStubs = Map(subscriptionUpdateInputsShouldBe -> subscriptionUpdateResponse)
        val expectedOutput = InternalServerError("identityId is null for subscription name A-S00339056")

        val mockSubscriptionUpdate = new MockSubscriptionUpdate(subscriptionUpdatePreviewStubs, subscriptionUpdateStubs)
        val mockGetInvoiceItems = new MockGetInvoiceItems(getInvoiceItemsStubs)
        val mockSQS = new MockSQS(sqsStubs)
        val mockInvoiceItemAdjustment = new MockInvoiceItemAdjustment(invoiceItemAdjustmentStubs)
        val mockDynamo = new MockDynamo(dynamoStubs)
        (for {
          _ <- TestClock.setTime(time)
          output <- new RecurringContributionToSupporterPlusImpl(
            new GetRatePlans(
              PROD,
              new MockCatalogue(),
            ),
            mockSubscriptionUpdate,
            new MockTermRenewal(termRenewalStubs),
            mockGetInvoiceItems,
            new MockGetInvoice(getInvoiceStubs),
            new MockCreatePayment(CreatePaymentResponse(Some(true))),
            mockInvoiceItemAdjustment,
            mockSQS,
            mockDynamo,
          ).run(
            subscriptionName,
            endpointJsonInputBody,
            getSubscriptionResponse,
            getAccountResponse,
          )
        } yield {
          assert(output)(equalTo(expectedOutput)) &&
          assert(mockSubscriptionUpdate.requests)(equalTo(List(subscriptionUpdateInputsShouldBe))) &&
          assert(mockSQS.requests)(equalTo(Nil)) &&
          assert(mockDynamo.requests)(equalTo(Nil))
        })
      } @@ TestAspect.ignore,
      test("productMove endpoint returns 500 error if subscription has more than one rateplan") {
        val endpointJsonInputBody = ExpectedInput(50.00, false, None, None)
        val subscriptionUpdateStubs = Map(subscriptionUpdateInputsShouldBe -> subscriptionUpdateResponse)
        val expectedOutput = InternalServerError("Subscription: A-S00339056 has more than one ratePlan")

        val mockSubscriptionUpdate = new MockSubscriptionUpdate(subscriptionUpdatePreviewStubs, subscriptionUpdateStubs)
        val mockGetInvoiceItems = new MockGetInvoiceItems(getInvoiceItemsStubs)
        val mockSQS = new MockSQS(sqsStubs)
        val mockInvoiceItemAdjustment = new MockInvoiceItemAdjustment(invoiceItemAdjustmentStubs)
        val mockDynamo = new MockDynamo(dynamoStubs)
        (for {
          output <- new RecurringContributionToSupporterPlusImpl(
            new GetRatePlans(
              PROD,
              new MockCatalogue(),
            ),
            mockSubscriptionUpdate,
            new MockTermRenewal(termRenewalStubs),
            mockGetInvoiceItems,
            new MockGetInvoice(getInvoiceStubs),
            new MockCreatePayment(CreatePaymentResponse(Some(true))),
            mockInvoiceItemAdjustment,
            mockSQS,
            mockDynamo,
          ).run(
            subscriptionName,
            endpointJsonInputBody,
            getSubscriptionResponse,
            getAccountResponse,
          )
        } yield {
          assert(output)(equalTo(expectedOutput)) &&
          assert(mockSubscriptionUpdate.requests)(equalTo(Nil)) &&
          assert(mockSQS.requests)(equalTo(Nil)) &&
          assert(mockDynamo.requests)(equalTo(Nil))
        })
      } @@ TestAspect.ignore,
      test("preview endpoint is successful (monthly sub, upsell)") {
        val endpointJsonInputBody = ExpectedInput(15.00, true, None, None)
        val subscriptionUpdateInputsShouldBe: (SubscriptionName, SubscriptionUpdateRequest) =
          (subscriptionName, expectedRequestBodyPreview)
        val subscriptionUpdatePreviewStubs =
          Map(subscriptionUpdateInputsShouldBe -> previewResponse)
        val expectedOutput = ProductMoveEndpointTypes.PreviewResult(
          amountPayableToday = 0,
          false,
          contributionRefundAmount = -20,
          supporterPlusPurchaseAmount = 20,
          LocalDate.of(2023, 3, 6),
        )

        val mockSubscriptionUpdate = new MockSubscriptionUpdate(subscriptionUpdatePreviewStubs, subscriptionUpdateStubs)
        val mockGetInvoiceItems = new MockGetInvoiceItems(getInvoiceItemsStubs)
        val mockSQS = new MockSQS(sqsStubs)
        val mockInvoiceItemAdjustment = new MockInvoiceItemAdjustment(invoiceItemAdjustmentStubs)
        val mockDynamo = new MockDynamo(dynamoStubs)
        (for {
          _ <- TestClock.setTime(time2)
          output <- new RecurringContributionToSupporterPlusImpl(
            new GetRatePlans(
              CODE,
              new MockCatalogue(),
            ),
            mockSubscriptionUpdate,
            new MockTermRenewal(termRenewalStubs),
            mockGetInvoiceItems,
            new MockGetInvoice(getInvoiceStubs),
            new MockCreatePayment(CreatePaymentResponse(Some(true))),
            mockInvoiceItemAdjustment,
            mockSQS,
            mockDynamo,
          ).run(
            subscriptionName,
            endpointJsonInputBody,
            getSubscriptionResponse,
            getAccountResponse,
          )
        } yield {
          assert(output)(equalTo(expectedOutput)) &&
          assert(mockSubscriptionUpdate.requests)(equalTo(List(subscriptionUpdateInputsShouldBe)))
        })
      } @@ TestAspect.ignore,
      test("available-product-moves endpoint") {
        val expectedOutput = AvailableProductMovesEndpointTypes.AvailableMoves(
          body = List(
            MoveToProduct(
              id = ProductRatePlanId("2c92a0fb4edd70c8014edeaa4eae220a"),
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
          IdentityUserId = someIdentityId,
        )
        val mockGetSubscriptionToCancel =
          new MockGetSubscriptionToCancel(Map(subscriptionName -> getSubscriptionForCancelResponse))
        val mockZuoraCancel = new MockZuoraCancel(
          Map(
            (subscriptionName, LocalDate.of(2022, 9, 29)) ->
              CancellationResponse(subscriptionName.value, LocalDate.of(2022, 9, 29), None),
          ),
        )
        val mockSQS = new MockSQS(Map(emailMessage -> ()))
        (for {
          _ <- TestClock.setTime(time)
          input = SubscriptionCancelEndpointTypes.ExpectedInput("mma_other")
          output <- new SubscriptionCancelEndpointSteps(
            getSubscription = new MockGetSubscription(getSubscriptionStubs()),
            getAccount = new MockGetAccount(Map(AccountNumber("accountNumber") -> getAccountResponse), Map.empty),
            getSubscriptionToCancel = mockGetSubscriptionToCancel,
            zuoraCancel = mockZuoraCancel,
            sqs = mockSQS,
            stage = Stage.valueOf("PROD"),
            zuoraSetCancellationReason = new MockZuoraSetCancellationReason(
              Map((SubscriptionName("A-S00339056"), 2, "mma_other") -> UpdateResponse(true)),
            ),
          ).subscriptionCancel(subscriptionName, input, someIdentityId.get)
        } yield {
          assert(output)(
            equalTo(ProductMoveEndpointTypes.Success("Subscription A-S00339056 was successfully cancelled")),
          ) &&
          assert(mockGetSubscriptionToCancel.requests)(equalTo(List(subscriptionName))) &&
          assert(mockZuoraCancel.requests)(equalTo(List((subscriptionName, LocalDate.of(2022, 9, 29))))) &&
          assert(mockSQS.requests)(hasSameElements(List(emailMessage)))
        })
      },
    )
  }
}
