package com.gu.productmove.zuora

import com.gu.productmove.GuStageLive.Stage
import com.gu.productmove.endpoint.cancel.{SubscriptionCancelEndpoint, SubscriptionCancelEndpointSteps}
import com.gu.productmove.endpoint.cancel.SubscriptionCancelEndpointTypes.ExpectedInput
import com.gu.productmove.{
  AwsCredentialsLive,
  AwsS3Live,
  GuStageLive,
  IdentityId,
  SQS,
  SQSLive,
  SecretsLive,
  SttpClientLive,
}
import com.gu.productmove.invoicingapi.InvoicingApiRefundLive
import com.gu.productmove.refund.{RefundInput, RefundSupporterPlus}
import com.gu.productmove.zuora.RefundSupporterPlusSpec.{suite, test}
import com.gu.productmove.zuora.rest.{ZuoraClientLive, ZuoraGetLive}
import com.gu.productmove.endpoint.cancel.SubscriptionCancelEndpointTypes.RefundType.*
import com.gu.productmove.endpoint.zuora.{GetSubscriptionToCancel, GetSubscriptionToCancelLive}
import com.gu.productmove.zuora.model.SubscriptionName
import zio.*
import zio.test.Assertion.equalTo
import zio.test.{Spec, TestAspect, TestClock, TestEnvironment, ZIOSpecDefault, assert}

import java.time.{LocalDateTime, ZoneOffset}

object SubscriptionCancelSpec extends ZIOAppDefault {

  override def run =
    /*
         Test suite used to run the cancellation lambda locally
     */
    (for {
      _ <- TestClock.setTime(LocalDateTime.now.toInstant(ZoneOffset.UTC))
      getSubscription <- ZIO.service[GetSubscription]
      getAccount <- ZIO.service[GetAccount]
      getSubscriptionToCancel <- ZIO.service[GetSubscriptionToCancel]
      zuoraCancel <- ZIO.service[ZuoraCancel]
      sqs <- ZIO.service[SQS]
      stage <- ZIO.service[Stage]
      zuoraSetCancellationReason <- ZIO.service[ZuoraSetCancellationReason]
      res <- new SubscriptionCancelEndpointSteps(
        getSubscription,
        getAccount,
        getSubscriptionToCancel,
        zuoraCancel,
        sqs,
        stage,
        zuoraSetCancellationReason,
      )
        .subscriptionCancel(
          SubscriptionName("A-S00499867"),
          ExpectedInput("mma_other"),
          IdentityId("1"),
        )
      _ <- ZIO.log("result: " + res)
    } yield ())
      .provide(
        GetSubscriptionLive.layer,
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

}
