package com.gu.productmove

import com.gu.productmove.endpoint.available.{Billing, Currency, MoveToProduct}
import com.gu.productmove.endpoint.move.ProductMoveEndpoint
import com.gu.productmove.endpoint.move.ProductMoveEndpointTypes.{ExpectedInput, OutputBody, Success}
import com.gu.productmove.zuora.{GetSubscription, TestGetSubscription}
import com.gu.productmove.zuora.GetSubscription.GetSubscriptionResponse
import zio.*
import zio.test.*
import zio.test.Assertion.*

object HandlerSpec extends ZIOSpecDefault {
  def spec = {
    val expectedSubToLookUp = "A-S00339056"
    suite("HandlerSpec")(
      test("runWithEnvironment doesn't do much yet") {
        val testInput = ExpectedInput("false")
        val expectedOutput = Success("newsubname", MoveToProduct("idid", "namename", Billing(None, None, Currency("GBP", "£"), None, None), None, None))
        for {
          output <- ProductMoveEndpoint.runWithEnvironment(testInput)
          requests <- TestGetSubscription.requests
        } yield {
          assert(output)(equalTo(expectedOutput)) &&
            assert(requests)(equalTo(List(expectedSubToLookUp)))
        }
      }
    ).provide(ZLayer.succeed(new TestGetSubscription(Map(expectedSubToLookUp -> "ididtest"))))
  }
}
