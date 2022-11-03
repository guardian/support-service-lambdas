package com.gu.productmove

import com.gu.newproduct.api.productcatalog.{BillingPeriod, Monthly}
import com.gu.productmove.*
import com.gu.productmove.GuStageLive.Stage
import com.gu.productmove.endpoint.available.{AvailableProductMovesEndpoint, Billing, Currency, MoveToProduct, Offer, TimePeriod, TimeUnit, Trial}
import com.gu.productmove.endpoint.move.ProductMoveEndpoint
import com.gu.productmove.endpoint.move.ProductMoveEndpointTypes.{ExpectedInput, OutputBody}
import com.gu.productmove.endpoint.move.ProductMoveEndpointTypes
import com.gu.productmove.endpoint.available.AvailableProductMovesEndpointTypes
import com.gu.productmove.zuora.GetAccount.{AccountSubscription, BasicInfo, BillToContact, GetAccountResponse, PaymentMethodResponse, ZuoraSubscription}
import com.gu.productmove.zuora.{CancellationResponse, CreateSubscriptionResponse, DefaultPaymentMethod, GetAccount, GetSubscription, MockCancelZuora, MockCatalogue, MockEmailSender, MockGetAccount, MockGetSubscription, MockInvoicePreview, MockSubscribe, MockSubscriptionUpdate, SubscriptionUpdateResponse}
import com.gu.productmove.zuora.GetSubscription.{GetSubscriptionResponse, RatePlan, RatePlanCharge}
import zio.*
import zio.test.*
import zio.test.Assertion.*

import java.time.{LocalDate, LocalDateTime, OffsetDateTime, ZoneOffset}
import scala.language.postfixOps

object HandlerSpec extends ZIOSpecDefault {
  def spec = {
    suite("HandlerSpec")(
      test("productMove endpoint is successful") {
        val expectedSubNameInput = "A-S00339056"
        val endpointJsonInputBody = ExpectedInput("50")

        val subscriptionUpdateInputsShouldBe: (String, BillingPeriod, String, String) = (expectedSubNameInput, Monthly, endpointJsonInputBody.price, "89ad8casd9c0asdcaj89sdc98as")

        val subscriptionUpdateResponse = CreateSubscriptionResponse("newSubscriptionName")
        val getSubscriptionStubs = Map(expectedSubNameInput -> getSubscriptionResponse)
        val subscriptionUpdateStubs = Map(subscriptionUpdateInputsShouldBe -> SubscriptionUpdateResponse("subscriptionId"))

        val emailSenderStubs = Map(emailMessageBody -> ())
        val getAccountStubs = Map("accountNumber" -> getAccountResponse)
        val getPaymentMethodResponse = PaymentMethodResponse(
          NumConsecutiveFailures = 0
        )
        val getPaymentMethodStubs = Map("paymentMethodId" -> getPaymentMethodResponse)
        val invoicePreviewStubs = Map(("zuoraAccountId", LocalDate.of(2022, 9, 29)) -> DigiSubWithOfferInvoicePreview)

        val expectedOutput = ProductMoveEndpointTypes.Success("A-S9999999")

        (for {
          output <- ProductMoveEndpoint.productMove(expectedSubNameInput, endpointJsonInputBody)
          getSubRequests <- MockGetSubscription.requests
          subUpdateRequests <- MockSubscriptionUpdate.requests
        } yield {
          assert(output)(equalTo(expectedOutput)) &&
            assert(getSubRequests)(equalTo(List(expectedSubNameInput))) &&
            assert(subUpdateRequests)(equalTo(List(subscriptionUpdateInputsShouldBe)))
        }).provide(
          ZLayer.succeed(new MockGetSubscription(getSubscriptionStubs)),
          ZLayer.succeed(new MockSubscriptionUpdate(subscriptionUpdateStubs)),
          ZLayer.succeed(new MockEmailSender(emailSenderStubs)),
          ZLayer.succeed(new MockInvoicePreview(invoicePreviewStubs)),
          ZLayer.succeed(new MockGetAccount(getAccountStubs, getPaymentMethodStubs)),
          ZLayer.succeed(Stage.valueOf("PROD"))
        )
      },

      /*
      test("productMove endpoint returns 500 error if chargedThroughDate is None") {
        val expectedSubNameInput = "A-S00339056"
        val testPostData = ExpectedInput("targetProductId")

        val createSubscriptionResponse = CreateSubscriptionResponse("newSubscriptionName")
        val cancellationResponse = CancellationResponse("newSubscriptionName", LocalDate.of(2022, 02, 02))

        val getSubscriptionStubs = Map(expectedSubNameInput -> getSubscriptionResponseNoChargedThroughDate)
        val subscribeStubs = Map(("zuoraAccountId", "targetProductId") -> createSubscriptionResponse)
        val cancellationStubs = Map(("A-S00339056", LocalDate.of(2022, 9, 29)) -> cancellationResponse)

        val emailSenderStubs = Map(emailMessageBody -> ())
        val getAccountStubs = Map("accountNumber" -> getAccountResponse)
        val getPaymentMethodResponse = PaymentMethodResponse(
          NumConsecutiveFailures = 0
        )
        val getPaymentMethodStubs = Map("paymentMethodId" -> getPaymentMethodResponse)
        val invoicePreviewStubs = Map(("zuoraAccountId", LocalDate.of(2022, 9, 29)) -> DigiSubWithOfferInvoicePreview)

        (for {
          output <- ProductMoveEndpoint.productMove(expectedSubNameInput, testPostData)
          getSubRequests <- MockGetSubscription.requests
          subscribeRequests <- MockSubscribe.requests
          cancellationRequests <- MockCancelZuora.requests
        } yield {
          assert(output)(equalTo(ProductMoveEndpointTypes.InternalServerError)) &&
            assert(getSubRequests)(equalTo(List(expectedSubNameInput))) &&
            assert(subscribeRequests)(equalTo(List())) &&
            assert(cancellationRequests)(equalTo(List()))
        }).provide(
          ZLayer.succeed(new MockGetSubscription(getSubscriptionStubs)),
          ZLayer.succeed(new MockSubscribe(subscribeStubs)),
          ZLayer.succeed(new MockCancelZuora(cancellationStubs)),
          ZLayer.succeed(new MockEmailSender(emailSenderStubs)),
          ZLayer.succeed(new MockInvoicePreview(invoicePreviewStubs)),
          ZLayer.succeed(new MockGetAccount(getAccountStubs, getPaymentMethodStubs)),
          ZLayer.succeed(Stage.valueOf("PROD"))
        )
      },
      */

      test("available-product-moves endpoint") {
        val time = OffsetDateTime.of(LocalDateTime.of(2022, 9, 16, 10, 2), ZoneOffset.ofHours(0)).toInstant
        val expectedSubNameInput = "A-S00339056"

        val getPaymentMethodResponse = PaymentMethodResponse(
          NumConsecutiveFailures = 0
        )

        val getSubscriptionStubs = Map(expectedSubNameInput -> getSubscriptionResponse)
        val getAccountStubs = Map("accountNumber" -> getAccountResponse)
        val getPaymentMethodStubs = Map("paymentMethodId" -> getPaymentMethodResponse)

        val expectedOutput = AvailableProductMovesEndpointTypes.AvailableMoves(
          body = List(MoveToProduct(
            id = "2c92a0fb4edd70c8014edeaa4eae220a",
            name = "Digital Pack",
            billing = Billing(
              amount = Some(1199),
              percentage = None,
              currency = Some(Currency.GBP),
              frequency = Some(TimePeriod(TimeUnit.month, 1)),
              startDate = Some("2022-12-28")
            ),
            trial = Some(Trial(14)),
            introOffer = Some(Offer(
              Billing(
                amount = None,
                percentage = Some(50),
                currency = None, //FIXME doesn't make sense for a percentage
                frequency = None, //FIXME doesn't make sense for a percentage
                startDate = Some("2022-09-29")
              ),
              duration = TimePeriod(TimeUnit.month, 3)
            ))
          ))
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
          ZLayer.succeed(new MockGetSubscription(getSubscriptionStubs)),
          ZLayer.succeed(new MockGetAccount(getAccountStubs, getPaymentMethodStubs)),
          ZLayer.succeed(Stage.valueOf("PROD"))
        )
      },

      test("available-product-moves endpoint returns empty response when user is in payment failure") {
        val time = OffsetDateTime.of(LocalDateTime.of(2022, 9, 16, 10, 2), ZoneOffset.ofHours(0)).toInstant
        val expectedSubNameInput = "A-S00339056"

        val getPaymentMethodResponse = PaymentMethodResponse(
          NumConsecutiveFailures = 3
        )

        val createSubscriptionResponse = CreateSubscriptionResponse("newSubscriptionName")

        val getSubscriptionStubs = Map(expectedSubNameInput -> getSubscriptionResponse)
        val getAccountStubs = Map("accountNumber" -> getAccountResponse)
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
          ZLayer.succeed(new MockGetSubscription(getSubscriptionStubs)),
          ZLayer.succeed(new MockGetAccount(getAccountStubs, getPaymentMethodStubs)),
          ZLayer.succeed(Stage.valueOf("PROD"))
        )
      },

      test("available-product-moves endpoint returns empty response when user does not have a card payment method") {
        val time = OffsetDateTime.of(LocalDateTime.of(2022, 9, 16, 10, 2), ZoneOffset.ofHours(0)).toInstant
        val expectedSubNameInput = "A-S00339056"

        val createSubscriptionResponse = CreateSubscriptionResponse("newSubscriptionName")

        val getPaymentMethodResponse = PaymentMethodResponse(
          NumConsecutiveFailures = 0
        )

        val getSubscriptionStubs = Map(expectedSubNameInput -> getSubscriptionResponse)
        val getAccountStubs = Map("accountNumber" -> directDebitGetAccountResponse)
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
            assert(accountRequests)(equalTo(List("accountNumber")))
        }).provide(
          ZLayer.succeed(new MockCatalogue),
          ZLayer.succeed(new MockGetSubscription(getSubscriptionStubs)),
          ZLayer.succeed(new MockGetAccount(getAccountStubs, getPaymentMethodStubs)),
          ZLayer.succeed(Stage.valueOf("PROD"))
        )
      }
    )
  }
}
