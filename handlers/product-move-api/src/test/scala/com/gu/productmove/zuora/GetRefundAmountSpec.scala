package com.gu.productmove.zuora

import com.gu.productmove.{AwsCredentialsLive, GuStageLive, SQSLive, SttpClientLive}
import com.gu.productmove.endpoint.cancel.SubscriptionCancelEndpoint
import com.gu.productmove.endpoint.cancel.SubscriptionCancelEndpointTypes.ExpectedInput
import com.gu.productmove.zuora.SubscriptionCancelSpec.{suite, test}
import com.gu.productmove.zuora.model.SubscriptionName
import com.gu.productmove.zuora.rest.{ZuoraClientLive, ZuoraGetLive}
import zio.{Scope, ZLayer}
import zio.test.Assertion.equalTo
import zio.test.{Spec, TestAspect, TestEnvironment, ZIOSpecDefault, assert}

import java.time.LocalDateTime
import java.time.format.DateTimeFormatter
import scala.collection.immutable.{ListMap, SortedMap}

object GetRefundAmountSpec extends ZIOSpecDefault {

  override def spec: Spec[TestEnvironment with Scope, Any] =
    suite("GetSwitchInvoice")(
      test("finds the right amount for a switched sub") {

        for {
          result <- GetInvoiceItemsForSubscription
            .get(SubscriptionName("A-S00492211"))
            .provide(
              GetInvoiceItemsForSubscriptionLive.layer,
              ZLayer.succeed(new MockGetInvoicesZuoraClient(MockGetInvoicesZuoraClient.switchedResponse)),
              ZuoraGetLive.layer,
            )
          negativeInvoiceId <- result.negativeInvoiceId
          lastPaidInvoiceId <- result.lastPaidInvoiceId
          lastPaidInvoiceAmount <- result.lastPaidInvoiceAmount
        } yield {
          assert(negativeInvoiceId)(equalTo("8ad0934e86a19cca0186a817d551251e"))
          assert(lastPaidInvoiceId)(equalTo("8ad08d2986a18ded0186a811f7e56e01"))
          assert(lastPaidInvoiceAmount)(equalTo(12.14))
        }
      },
      test("finds the right amount for a regular cancelled sub") {
        for {
          result <- GetInvoiceItemsForSubscription
            .get(SubscriptionName("A-S00502641"))
            .provide(
              GetInvoiceItemsForSubscriptionLive.layer,
              ZLayer.succeed(new MockGetInvoicesZuoraClient(MockGetInvoicesZuoraClient.standardSubResponse)),
              ZuoraGetLive.layer,
            )
          negativeInvoiceId <- result.negativeInvoiceId
          lastPaidInvoiceId <- result.lastPaidInvoiceId
          lastPaidInvoiceAmount <- result.lastPaidInvoiceAmount
        } yield {
          assert(negativeInvoiceId)(equalTo("8ad09b2186b5fdb50186b708669f2114"))
          assert(lastPaidInvoiceId)(equalTo("8ad08c8486b5ec340186b70539871852"))
          assert(lastPaidInvoiceAmount)(equalTo(20))
        }
      },
    )

}
