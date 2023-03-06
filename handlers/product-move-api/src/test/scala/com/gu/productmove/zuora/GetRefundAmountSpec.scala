package com.gu.productmove.zuora

import com.gu.productmove.{AwsCredentialsLive, GuStageLive, SQSLive, SttpClientLive}
import com.gu.productmove.endpoint.cancel.SubscriptionCancelEndpoint
import com.gu.productmove.endpoint.cancel.SubscriptionCancelEndpointTypes.ExpectedInput
import com.gu.productmove.endpoint.cancel.zuora.GetSubscriptionLive
import com.gu.productmove.zuora.SubscriptionCancelSpec.{suite, test}
import com.gu.productmove.zuora.rest.{ZuoraClientLive, ZuoraGetLive}
import zio.{Scope, ZLayer}
import zio.test.Assertion.equalTo
import zio.test.{Spec, TestAspect, TestEnvironment, ZIOSpecDefault, assert}

import java.time.LocalDateTime
import java.time.format.DateTimeFormatter
import scala.collection.immutable.{ListMap, SortedMap}

object GetRefundAmountSpec extends ZIOSpecDefault {

  override def spec: Spec[TestEnvironment with Scope, Any] =
    suite("GetSwitchInvoice")(test("finds the right amount for a switched sub") {

      for {
        result <- GetInvoiceToBeRefunded
          .get("A-S00492211")
          .provide(
            GetInvoiceToBeRefundedLive.layer,
            SttpClientLive.layer,
            ZLayer.succeed(new MockGetInvoicesZuoraClient(MockGetInvoicesZuoraClient.switchedResponse)),
            ZuoraGetLive.layer,
          )
      } yield {
        assert(result.getNegativeInvoice._1)(equalTo("8ad0934e86a19cca0186a817d551251e"))
        assert(result.getLastPaidInvoice._1)(equalTo("8ad08d2986a18ded0186a811f7e56e01"))
        assert(result.getLastPaidInvoiceAmount)(equalTo(12.14))
      }
    },
      test("finds the right amount for a regular cancelled sub") {
        for {
          result <- GetInvoiceToBeRefunded
            .get("A-S00502641")
            .provide(
              GetInvoiceToBeRefundedLive.layer,
              SttpClientLive.layer,
              ZLayer.succeed(new MockGetInvoicesZuoraClient(MockGetInvoicesZuoraClient.standardSubResponse)),
              ZuoraGetLive.layer,
            )
        } yield {
          assert(result.getNegativeInvoice._1)(equalTo("8ad09b2186b5fdb50186b708669f2114"))
          assert(result.getLastPaidInvoice._1)(equalTo("8ad08c8486b5ec340186b70539871852"))
          assert(result.getLastPaidInvoiceAmount)(equalTo(20))
        }
      }
    )

}
