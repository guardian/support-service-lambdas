package com.gu.productmove

import com.gu.productmove.GuStageLive.Stage
import com.gu.productmove.endpoint.available.{AvailableProductMovesEndpoint, Billing, Currency, MoveToProduct, Offer, TimePeriod, TimeUnit, Trial}
import com.gu.productmove.endpoint.move.ProductMoveEndpoint
import com.gu.productmove.endpoint.move.ProductMoveEndpointTypes.{ExpectedInput, OutputBody}
import com.gu.productmove.endpoint.move.ProductMoveEndpointTypes
import com.gu.productmove.endpoint.available.AvailableProductMovesEndpointTypes
import com.gu.productmove.zuora.GetAccount.{BasicInfo, BillingAndPayment, GetAccountResponse, PaymentMethodResponse, ZuoraSubscription}
import com.gu.productmove.zuora.{CancellationResponse, CreateSubscriptionResponse, DefaultPaymentMethod, GetAccount, GetSubscription, MockCancelZuora, MockCatalogue, MockGetAccount, MockGetSubscription, MockSubscribe}
import com.gu.productmove.zuora.GetSubscription.{GetSubscriptionResponse, RatePlan, RatePlanCharge}
import zio.*
import zio.test.*
import zio.test.Assertion.*

import java.time.{LocalDate, LocalDateTime, OffsetDateTime, ZoneOffset}

object HandlerSpec extends ZIOSpecDefault {
  private val getSubscriptionResponse = GetSubscriptionResponse("subscriptionName", "zuoraAccountId", "accountNumber", ratePlans = List(
    RatePlan(
      id = "R1",
      productName = "P1",
      productRatePlanId = "2c92a0fc5aacfadd015ad24db4ff5e97",
      ratePlanName = "RP1",
      ratePlanCharges = List(
        RatePlanCharge(
          productRatePlanChargeId = "PRPC1",
          name = "Digital Pack Monthly",
          price = 11.11,
          currency = "GBP",
          number = "number",
          effectiveStartDate = LocalDate.of(2017, 12, 15),
          effectiveEndDate = LocalDate.of(2020, 11, 29),
          chargedThroughDate = Some(LocalDate.of(2022, 9, 29)),
          billingPeriod = Some("billingPeriod"),
        )
      )
    )
  ))

  private val getAccountResponse = GetAccountResponse(
    BasicInfo(
      DefaultPaymentMethod(
        id = "paymentMethodId",
        creditCardExpirationDate = LocalDate.of(2099,02,02)
      )
    ),
    BillingAndPayment("GBP"),
    List(getSubscriptionResponse)
  )

  def spec = {
    suite("HandlerSpec")(
      test("productMove endpoint") {
        val expectedSubNameInput = "A-S00339056"
        val testPostData = ExpectedInput("targetProductId")

        val createSubscriptionResponse = CreateSubscriptionResponse("newSubscriptionName")
        val cancellationResponse = CancellationResponse("newSubscriptionName", LocalDate.of(2022,02,02))

        val getSubscriptionStubs = Map(expectedSubNameInput -> getSubscriptionResponse)
        val subscribeStubs = Map(("zuoraAccountId", "targetProductId") -> createSubscriptionResponse)
        val cancellationStubs = Map(("A-S00339056", LocalDate.of(2022, 9, 29)) -> cancellationResponse)

        val expectedOutput = ProductMoveEndpointTypes.Success(
          newSubscriptionName = "newSubscriptionName",
          newProduct = MoveToProduct(
            id = "123",
            name = "Digital Pack",
            billing = Billing(
              amount = Some(1199),
              percentage = None,
              currency = Some(Currency.GBP),
              frequency = Some(
                TimePeriod(
                  name = TimeUnit.month,
                  count = 1
                )
              ),
              startDate = Some("2022-09-21")
            ),
            trial = Some(Trial(dayCount = 14)),
            introOffer = Some(
              Offer(
                billing = Billing(
                  amount = None,
                  percentage = Some(50),
                  currency = Some(Currency.GBP),
                  frequency = None,
                  startDate = Some("2022-09-21")
                ),
                duration = TimePeriod(
                  name = TimeUnit.month,
                  count = 3
                )
              )
            )
          )
        )

        (for {
          output <- ProductMoveEndpoint.productMove(expectedSubNameInput, testPostData)
          getSubRequests <- MockGetSubscription.requests
          subscribeRequests <- MockSubscribe.requests
          cancellationRequests <- MockCancelZuora.requests
        } yield {
          assert(output)(equalTo(expectedOutput)) &&
          assert(getSubRequests)(equalTo(List(expectedSubNameInput))) &&
          assert(subscribeRequests)(equalTo(List(("zuoraAccountId", "targetProductId")))) &&
            assert(cancellationRequests)(equalTo(List(("A-S00339056", LocalDate.of(2022, 9, 29)))))
        }).provide(
          ZLayer.succeed(new MockGetSubscription(getSubscriptionStubs)),
          ZLayer.succeed(new MockSubscribe(subscribeStubs)),
          ZLayer.succeed(new MockCancelZuora(cancellationStubs))
        )
      },

      test("productMove endpoint fails if chargedThroughDate is None") {
        val expectedSubNameInput = "A-S00339056"
        val testPostData = ExpectedInput("targetProductId")

        val getSubscriptionResponse = GetSubscriptionResponse("subscriptionName", "zuoraAccountId", "accountNumber", ratePlans = List(
          RatePlan(
            id = "R1",
            productName = "P1",
            productRatePlanId = "PRP1",
            ratePlanName = "RP1",
            ratePlanCharges = List(
              RatePlanCharge(
                productRatePlanChargeId = "PRPC1",
                name = "Digital Pack Monthly",
                price = 11.11,
                currency = "GBP",
                number = "number",
                effectiveStartDate = LocalDate.of(2017, 12, 15),
                effectiveEndDate = LocalDate.of(2020, 11, 29),
                chargedThroughDate = None,
                billingPeriod = Some("billingPeriod"),
              )
            )
          )
        ))

        val createSubscriptionResponse = CreateSubscriptionResponse("newSubscriptionName")
        val cancellationResponse = CancellationResponse("newSubscriptionName", LocalDate.of(2022,02,02))

        val getSubscriptionStubs = Map(expectedSubNameInput -> getSubscriptionResponse)
        val subscribeStubs = Map(("zuoraAccountId", "targetProductId") -> createSubscriptionResponse)
        val cancellationStubs = Map(("A-S00339056", LocalDate.of(2022, 9, 29)) -> cancellationResponse)

        val expectedOutput = ProductMoveEndpointTypes.Success(
          newSubscriptionName = "newSubscriptionName",
          newProduct = MoveToProduct(
            id = "123",
            name = "Digital Pack",
            billing = Billing(
              amount = Some(1199),
              percentage = None,
              currency = Some(Currency.GBP),
              frequency = Some(
                TimePeriod(
                  name = TimeUnit.month,
                  count = 1
                )
              ),
              startDate = Some("2022-09-21")
            ),
            trial = Some(Trial(dayCount = 14)),
            introOffer = Some(
              Offer(
                billing = Billing(
                  amount = None,
                  percentage = Some(50),
                  currency = Some(Currency.GBP),
                  frequency = None,
                  startDate = Some("2022-09-21")
                ),
                duration = TimePeriod(
                  name = TimeUnit.month,
                  count = 3
                )
              )
            )
          )
        )

        (for {
          output <- ProductMoveEndpoint.productMove(expectedSubNameInput, testPostData).exit
          getSubRequests <- MockGetSubscription.requests
          subscribeRequests <- MockSubscribe.requests
          cancellationRequests <- MockCancelZuora.requests
        } yield {
          assert(output)(fails(equalTo("chargedThroughDate is null for subscription A-S00339056."))) &&
            assert(getSubRequests)(equalTo(List(expectedSubNameInput))) &&
            assert(subscribeRequests)(equalTo(List())) &&
            assert(cancellationRequests)(equalTo(List()))
        }).provide(
          ZLayer.succeed(new MockGetSubscription(getSubscriptionStubs)),
          ZLayer.succeed(new MockSubscribe(subscribeStubs)),
          ZLayer.succeed(new MockCancelZuora(cancellationStubs))
        )
      },

      test("available-product-moves endpoint") {
        val time = OffsetDateTime.of(LocalDateTime.of(2022, 9, 16, 10, 2), ZoneOffset.ofHours(0))
        val expectedSubNameInput = "A-S00339056"

        val getPaymentMethodResponse = PaymentMethodResponse(
          NumConsecutiveFailures = 0
        )

        val getSubscriptionStubs = Map(expectedSubNameInput -> getSubscriptionResponse)
        val getAccountStubs = Map("accountNumber" -> getAccountResponse)
        val getPaymentMethodStubs = Map("paymentMethodId" -> getPaymentMethodResponse)

        val expectedOutput = AvailableProductMovesEndpointTypes.Success(
          body = List(MoveToProduct(
            id = "A-S00339056",
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
            )))
        ))

        (for {
          _ <- TestClock.setDateTime(time)

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
        val time = OffsetDateTime.of(LocalDateTime.of(2022, 9, 16, 10, 2), ZoneOffset.ofHours(0))
        val expectedSubNameInput = "A-S00339056"

        val getPaymentMethodResponse = PaymentMethodResponse(
          NumConsecutiveFailures = 3
        )

        val createSubscriptionResponse = CreateSubscriptionResponse("newSubscriptionName")

        val getSubscriptionStubs = Map(expectedSubNameInput -> getSubscriptionResponse)
        val getAccountStubs = Map("accountNumber" -> getAccountResponse)
        val getPaymentMethodStubs = Map("paymentMethodId" -> getPaymentMethodResponse)

        val expectedOutput = AvailableProductMovesEndpointTypes.Success(body = List())

        (for {
          _ <- TestClock.setDateTime(time)

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
        }
    )
  }
}
