package com.gu.productmove

import com.gu.productmove.endpoint.available.{Billing, Currency, MoveToProduct, Offer, TimePeriod, TimeUnit, Trial}
import com.gu.productmove.endpoint.move.ProductMoveEndpoint
import com.gu.productmove.endpoint.move.ProductMoveEndpointTypes.{ExpectedInput, OutputBody, Success}
import com.gu.productmove.zuora.{GetSubscription, MockSubscribe, TestGetSubscription}
import com.gu.productmove.zuora.GetSubscription.GetSubscriptionResponse
import zio.*
import zio.test.*
import zio.test.Assertion.*

object HandlerSpec extends ZIOSpecDefault {
def spec = {
  suite("HandlerSpec")(
    test("runWithEnvironment doesn't do much yet") {
      val testInput = ExpectedInput("false")
      val expectedOutput = Success(
        newSubscriptionName = "asdf",
        newProduct = MoveToProduct(
          id = "123",
          name = "Digital Pack",
          billing = Billing(
            amount = Some(1199),
            percentage = None,
            currency = Currency.GBP,
            frequency = Some(TimePeriod(
              name = TimeUnit.month,
              count = 1
            )),
            startDate = Some("2022-09-21")
          ),
          trial = Some(Trial(dayCount = 14)),
          introOffer = Some(Offer(
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
          ))
        )
      )
      for {
        output <- ProductMoveEndpoint.productMove(testInput)
        GetSubscriptionStubs <- TestGetSubscription.requests
        SubscribeStubs <- MockSubscribe.requests
      } yield {
        assert(output)(equalTo(expectedOutput))
      }
    }
  ).provide(ZLayer.succeed(new TestGetSubscription(Map("A-S00339056" -> "ididtest"))),
    ZLayer.succeed(new MockSubscribe(Map("A-S00339056" -> "newSubscriptionId"))))
}
}

