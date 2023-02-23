package com.gu.productmove.zuora

import com.gu.productmove.endpoint.cancel.SubscriptionCancelEndpoint
import com.gu.productmove.endpoint.cancel.zuora.GetSubscriptionLive
import com.gu.productmove.endpoint.cancel.SubscriptionCancelEndpointTypes.ExpectedInput
import com.gu.productmove.{AwsCredentialsLive, AwsS3Live, GuStageLive, SQSLive, SttpClientLive}
import com.gu.productmove.invoicingapi.InvoicingApiRefundLive
import com.gu.productmove.refund.{Refund, RefundInput}
import com.gu.productmove.zuora.RefundSpec.{suite, test}
import com.gu.productmove.zuora.rest.{ZuoraClientLive, ZuoraGetLive}
import zio.Scope
import zio.test.Assertion.equalTo
import zio.test.{Spec, TestAspect, TestEnvironment, ZIOSpecDefault, assert}


object SubscriptionCancelSpec extends ZIOSpecDefault{

  override def spec: Spec[TestEnvironment with Scope, Any] =
    suite("Cancel")(test("Run cancellation lambda locally") {
      /*
           Test suite used to run the cancellation lambda locally
       */

      for {
        _ <- SubscriptionCancelEndpoint.subscriptionCancel("A-S00496717", ExpectedInput("mma_other"))
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
          )
      } yield assert(true)(equalTo(true))
    }) // @@ TestAspect.ignore)

}
