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
import scala.collection.mutable

object GetRefundAmountSpec extends ZIOSpecDefault {

  override def spec: Spec[TestEnvironment with Scope, Any] =
    suite("GetSwitchInvoice")(
      test("finds the right amount for a switched sub") {

        for {
          invoicesForRefund <- GetRefundInvoiceDetails
            .get(SubscriptionName("A-S00492211"))
            .provide(
              GetRefundInvoiceDetailsLive.layer,
              ZLayer.succeed(new MockGetInvoicesZuoraClient(MockGetInvoicesZuoraClient.switchedResponse)),
              ZuoraGetLive.layer,
            )
        } yield {
          assert(invoicesForRefund.negativeInvoiceId)(equalTo("8ad0934e86a19cca0186a817d551251e")) &&
          assert(invoicesForRefund.refundAmount)(equalTo(12.14))
        }
      },
      test("finds the right amount for a switched sub where tax has been paid") {

        for {
          invoicesForRefund <- GetRefundInvoiceDetails
            .get(SubscriptionName("A-S01918489"))
            .provide(
              GetRefundInvoiceDetailsLive.layer,
              ZLayer.succeed(
                new MockStackedGetInvoicesZuoraClient(
                  mutable.Stack(
                    MockGetInvoicesZuoraClient.responseWithTaxToMatchTaxItems,
                    MockGetInvoicesZuoraClient.taxationItemsResponse,
                  ),
                ),
              ),
              ZuoraGetLive.layer,
            )
        } yield {
          assert(invoicesForRefund.negativeInvoiceId)(equalTo("8ad08dc989e27bbe0189e40e61110aba")) &&
          assert(invoicesForRefund.refundAmount)(equalTo(10))
        }
      },
      test("finds the right amount for a regular cancelled sub") {
        for {
          invoicesForRefund <- GetRefundInvoiceDetails
            .get(SubscriptionName("A-S00502641"))
            .provide(
              GetRefundInvoiceDetailsLive.layer,
              ZLayer.succeed(new MockGetInvoicesZuoraClient(MockGetInvoicesZuoraClient.standardSubResponse)),
              ZuoraGetLive.layer,
            )
        } yield {
          assert(invoicesForRefund.negativeInvoiceId)(equalTo("8ad09b2186b5fdb50186b708669f2114")) &&
          assert(invoicesForRefund.refundAmount)(equalTo(20))
        }
      },
    )

}
