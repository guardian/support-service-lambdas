package com.gu.productmove

import com.gu.productmove.endpoint.available.{Billing, Currency, MoveToProduct, Offer, TimePeriod, TimeUnit, Trial}
import com.gu.productmove.endpoint.move.ProductMoveEndpoint
import com.gu.productmove.endpoint.move.ProductMoveEndpointTypes.{ExpectedInput, OutputBody, Success}
import com.gu.productmove.zuora.{CancellationResponse, CreateSubscriptionResponse, GetSubscription, MockCancellation, MockSubscribe, TestGetSubscription}
import com.gu.productmove.zuora.GetSubscription.{GetSubscriptionResponse, RatePlan, RatePlanCharge}
import zio.*
import zio.test.*
import zio.test.Assertion.*

import java.time.LocalDate

object HandlerSpec extends ZIOSpecDefault {
  def spec = {
    suite("HandlerSpec")(
      test("productMove endpoint") {
        val expectedSubNameInput = "A-S00339056"
        val testPostData = ExpectedInput("targetProductId")

        val getSubscriptionResponse = GetSubscriptionResponse("subscriptionName", "zuoraAccountId", ratePlans = List(
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
                number = "number",
                effectiveStartDate = LocalDate.of(2017, 12, 15),
                effectiveEndDate = LocalDate.of(2020, 11, 29),
                chargedThroughDate = Some(LocalDate.of(2022, 9, 29)),
                billingPeriod = Some("billingPeriod"),
              )
            )
          )
        ))

        val createSubscriptionResponse = CreateSubscriptionResponse("newSubscriptionName")
        val cancellationResponse = CancellationResponse("newSubscriptionName", LocalDate.of(2022,02,02))

        val GetSubscriptionStubs = Map(expectedSubNameInput -> getSubscriptionResponse)
        val SubscribeStubs = Map(("zuoraAccountId", "targetProductId") -> createSubscriptionResponse)
        val CancellationStubs = Map(("A-S00339056", LocalDate.of(2022, 9, 29)) -> cancellationResponse)

        val expectedOutput = Success(
          newSubscriptionName = "newSubscriptionName",
          newProduct = MoveToProduct(
            id = "123",
            name = "Digital Pack",
            billing = Billing(
              amount = Some(1199),
              percentage = None,
              currency = Currency.GBP,
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
                  currency = Currency.GBP,
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
          testRequests <- TestGetSubscription.requests
          subscribeRequests <- MockSubscribe.requests
          cancellationRequests <- MockCancellation.requests
        } yield {
          assert(output)(equalTo(expectedOutput)) &&
          assert(testRequests)(equalTo(List(expectedSubNameInput))) &&
          assert(subscribeRequests)(equalTo(List(("zuoraAccountId", "targetProductId")))) &&
            assert(cancellationRequests)(equalTo(List(("A-S00339056", LocalDate.of(2022, 9, 29)))))
        }).provide(
          ZLayer.succeed(new TestGetSubscription(GetSubscriptionStubs)),
          ZLayer.succeed(new MockSubscribe(SubscribeStubs)),
          ZLayer.succeed(new MockCancellation(CancellationStubs))
        )
      },

      test("productMove endpoint fails if chargedThroughDate is None") {
        val expectedSubNameInput = "A-S00339056"
        val testPostData = ExpectedInput("targetProductId")

        val getSubscriptionResponse = GetSubscriptionResponse("subscriptionName", "zuoraAccountId", ratePlans = List(
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

        val GetSubscriptionStubs = Map(expectedSubNameInput -> getSubscriptionResponse)
        val SubscribeStubs = Map(("zuoraAccountId", "targetProductId") -> createSubscriptionResponse)
        val CancellationStubs = Map(("A-S00339056", LocalDate.of(2022, 9, 29)) -> cancellationResponse)

        val expectedOutput = Success(
          newSubscriptionName = "newSubscriptionName",
          newProduct = MoveToProduct(
            id = "123",
            name = "Digital Pack",
            billing = Billing(
              amount = Some(1199),
              percentage = None,
              currency = Currency.GBP,
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
                  currency = Currency.GBP,
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
          testRequests <- TestGetSubscription.requests
          subscribeRequests <- MockSubscribe.requests
          cancellationRequests <- MockCancellation.requests
        } yield {
          assert(output)(fails(equalTo("chargedThroughDate is null for subscription A-S00339056."))) &&
            assert(testRequests)(equalTo(List(expectedSubNameInput))) &&
            assert(subscribeRequests)(equalTo(List())) &&
            assert(cancellationRequests)(equalTo(List()))
        }).provide(
          ZLayer.succeed(new TestGetSubscription(GetSubscriptionStubs)),
          ZLayer.succeed(new MockSubscribe(SubscribeStubs)),
          ZLayer.succeed(new MockCancellation(CancellationStubs))
        )
      }
    )
  }
}
