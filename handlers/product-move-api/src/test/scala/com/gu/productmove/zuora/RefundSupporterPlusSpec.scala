package com.gu.productmove.zuora

import com.gu.productmove.GuStageLive.Stage
import com.gu.productmove.refund.*
import com.gu.productmove.{AwsCredentialsLive, AwsS3Live, GuStageLive, SQSLive, SttpClientLive}
import com.gu.productmove.endpoint.available.{Billing, Currency, MoveToProduct, Offer, TimePeriod, TimeUnit, Trial}
import com.gu.productmove.endpoint.move.ProductMoveEndpoint
import com.gu.productmove.endpoint.move.ProductMoveEndpointTypes.ExpectedInput
import com.gu.productmove.invoicingapi.InvoicingApiRefundLive
import com.gu.productmove.SecretsLive
import com.gu.productmove.zuora.GetSubscription
import com.gu.productmove.zuora.Subscribe.*
import com.gu.productmove.zuora.GetSubscription.GetSubscriptionResponse
import com.gu.productmove.zuora.model.SubscriptionName
import com.gu.productmove.zuora.rest.{ZuoraClientLive, ZuoraGetLive}
import zio.{IO, ZIO}
import zio.*
import zio.test.Assertion.*
import zio.test.*

object RefundSupporterPlusSpec extends ZIOSpecDefault {
  override def spec: Spec[TestEnvironment with Scope, Any] =
    suite("RefundSupporterPlus")(
      test("Run refund lambda locally") {
        /*
           Test suite used to run the RefundSupporterPlus lambda locally
         */
        for {
          _ <- RefundSupporterPlus
            .applyRefund(RefundInput(SubscriptionName("A-S00631533")))
            .provide(
              AwsS3Live.layer,
              AwsCredentialsLive.layer,
              SttpClientLive.layer,
              ZuoraClientLive.layer,
              ZuoraGetLive.layer,
              GuStageLive.layer,
              InvoicingApiRefundLive.layer,
              CreditBalanceAdjustmentLive.layer,
              GetRefundInvoiceDetailsLive.layer,
              GetInvoiceLive.layer,
              InvoiceItemAdjustmentLive.layer,
              SecretsLive.layer,
              SQSLive.layer,
            )
        } yield assert(true)(equalTo(true))
      } @@ TestAspect.ignore,
      test("Balance invoices locally") {
        /*
             Test suite used to run the ensureThatNegativeInvoiceBalanceIsZero lambda locally
         */
        for {
          _ <- TestClock.setTime(java.time.Instant.now())
          _ <- RefundSupporterPlus
            .applyRefund(RefundInput(SubscriptionName("A-S00629631")))
            .provide(
              AwsS3Live.layer,
              AwsCredentialsLive.layer,
              SttpClientLive.layer,
              ZuoraClientLive.layer,
              ZuoraGetLive.layer,
              GuStageLive.layer,
              ZLayer.succeed(new MockInvoicingApiRefund()),
              CreditBalanceAdjustmentLive.layer,
              GetRefundInvoiceDetailsLive.layer,
              GetInvoiceLive.layer,
              InvoiceItemAdjustmentLive.layer,
              SecretsLive.layer,
              SQSLive.layer,
            )
        } yield assert(true)(equalTo(true))
      } @@ TestAspect.ignore,
    )
}
