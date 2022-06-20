package com.gu.productmove

import com.gu.productmove.ProductMoveEndpointTypes.{ExpectedInput, OutputBody}
import com.gu.productmove.zuora.{GetSubscription, TestGetSubscription}
import com.gu.productmove.zuora.GetSubscription.GetSubscriptionResponse
import zio.*
import zio.test.*
import zio.test.Assertion.*

object HandlerSpec extends ZIOSpecDefault {
  def spec = suite("HandlerSpec")(
    test("runWithEnvironment doesn't do much yet") {
      for {
        output <- ProductMoveEndpoint.runWithEnvironment(ExpectedInput(false))
        requests <- TestGetSubscription.requests
      } yield assert(output)(equalTo(OutputBody("hello"))) &&
        assert(requests)(equalTo(List("A-S00339056")))
    }
  ).provide(ZLayer.succeed(new TestGetSubscription(Map("A-S00339056" -> "ididtest"))))
}
