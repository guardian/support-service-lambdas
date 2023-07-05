package com.gu.productmove.zuora

import com.gu.productmove.endpoint.cancel.SubscriptionCancelEndpoint
import com.gu.productmove.endpoint.cancel.SubscriptionCancelEndpointTypes.ExpectedInput
import com.gu.productmove.{AwsCredentialsLive, AwsS3Live, GuStageLive, SQSLive, SttpClientLive}
import com.gu.productmove.invoicingapi.InvoicingApiRefundLive
import com.gu.productmove.refund.{RefundInput, RefundSupporterPlus}
import com.gu.productmove.zuora.RefundSupporterPlusSpec.{suite, test}
import com.gu.productmove.zuora.rest.{ZuoraClientLive, ZuoraGetLive}
import com.gu.productmove.endpoint.cancel.SubscriptionCancelEndpointTypes.RefundType.*
import com.gu.productmove.endpoint.zuora.GetSubscriptionToCancelLive
import com.gu.productmove.zuora.model.SubscriptionName
import com.gu.productmove.SecretsLive
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
          .subscriptionCancel(SubscriptionName("A-S00499867"), ExpectedInput("mma_other"))
          .provide(
            GetSubscriptionToCancelLive.layer,
            ZuoraCancelLive.layer,
            SQSLive.layer,
            ZuoraSetCancellationReasonLive.layer,
            GuStageLive.layer,
            ZuoraGetLive.layer,
            AwsCredentialsLive.layer,
            ZuoraClientLive.layer,
            SttpClientLive.layer,
            GetAccountLive.layer,
            SecretsLive.layer,
          )
      } yield assert(true)(equalTo(true))
    } @@ TestAspect.ignore)

}
