package com.gu.productmove.zuora

import com.gu.productmove.{AwsCredentialsLive, DynamoLive, GuStageLive, SQSLive, SttpClientLive}
import com.gu.productmove.endpoint.move.ProductMoveEndpoint
import com.gu.productmove.endpoint.move.ProductMoveEndpointTypes.ExpectedInput
import com.gu.productmove.zuora.rest.{ZuoraClientLive, ZuoraGetLive}
import java.time.*
import zio.Scope
import zio.*
import zio.test.Assertion.*
import zio.test.*
import zio.test.{Spec, TestAspect, TestEnvironment, ZIOSpecDefault}

object ProductMoveSpec extends ZIOSpecDefault {

  override def spec: Spec[TestEnvironment with Scope, Any] =
    suite("Switch")(test("Run product switch lambda locally") {
      /*
           Test suite used to run the cancellation lambda locally
       */

      for {
        _ <- TestClock.setTime(Instant.now())
        _ <- ProductMoveEndpoint.productMove("A-S00487531", ExpectedInput(20, false, None, None))
          .provide(
            GetSubscriptionLive.layer,
            AwsCredentialsLive.layer,
            SttpClientLive.layer,
            ZuoraClientLive.layer,
            ZuoraGetLive.layer,
            SubscriptionUpdateLive.layer,
            SQSLive.layer,
            GetAccountLive.layer,
            GuStageLive.layer,
            DynamoLive.layer,
          )
      } yield {

        assert(true)(equalTo(true))
      }
    })

}
