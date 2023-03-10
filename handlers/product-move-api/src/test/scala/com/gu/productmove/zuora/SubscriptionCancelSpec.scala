package com.gu.productmove.zuora

import com.gu.productmove.endpoint.cancel.SubscriptionCancelEndpoint
import com.gu.productmove.endpoint.cancel.zuora.GetSubscriptionLive
import com.gu.productmove.endpoint.cancel.SubscriptionCancelEndpointTypes.ExpectedInput
import com.gu.productmove.{AwsCredentialsLive, AwsS3Live, GuStageLive, SQSLive, SttpClientLive}
import com.gu.productmove.invoicingapi.InvoicingApiRefundLive
import com.gu.productmove.refund.{RefundSupporterPlus, RefundInput}
import com.gu.productmove.zuora.RefundSupporterPlusSpec.{suite, test}
import com.gu.productmove.zuora.rest.{ZuoraClientLive, ZuoraGetLive}
import com.gu.productmove.endpoint.cancel.SubscriptionCancelEndpointTypes.RefundType.*
import zio.Scope
import zio.test.Assertion.equalTo
import zio.test.{Spec, TestAspect, TestClock, TestEnvironment, ZIOSpecDefault, assert}

import java.time.{LocalDateTime, ZoneOffset}

object SubscriptionCancelSpec extends ZIOSpecDefault {

  override def spec: Spec[TestEnvironment with Scope, Any] =
    suite("Cancel")(test("Run cancellation lambda locally") {
      /*
           Test suite used to run the cancellation lambda locally
       */

      for {
        _ <- TestClock.setTime(LocalDateTime.now.toInstant(ZoneOffset.UTC))
        _ <- SubscriptionCancelEndpoint
          .subscriptionCancel("A-S00501468", ExpectedInput("mma_other"), refundType = Synchronous)
          .provide(
            GetSubscriptionLive.layer,
            ZuoraCancelLive.layer,
            SQSLive.layer,
            ZuoraSetCancellationReasonLive.layer,
            AwsCredentialsLive.layer,
            SttpClientLive.layer,
            ZuoraClientLive.layer,
            ZuoraGetLive.layer,
            GuStageLive.layer,
            InvoicingApiRefundLive.layer,
            CreditBalanceAdjustmentLive.layer,
            AwsS3Live.layer,
            GetInvoiceItemsForSubscriptionLive.layer,
            GetInvoiceLive.layer,
            InvoiceItemAdjustmentLive.layer,
          )
      } yield assert(true)(equalTo(true))
    } @@ TestAspect.ignore)

}
