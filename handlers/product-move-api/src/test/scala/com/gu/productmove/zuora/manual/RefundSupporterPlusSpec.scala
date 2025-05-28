package com.gu.productmove.zuora.manual

import com.gu.productmove.GuStageLive.Stage
import com.gu.productmove.endpoint.available.*
import com.gu.productmove.endpoint.move.ProductMoveEndpoint
import com.gu.productmove.endpoint.move.ProductMoveEndpointTypes.ExpectedInput
import com.gu.productmove.invoicingapi.InvoicingApiRefundLive
import com.gu.productmove.refund.*
import com.gu.productmove.zuora.GetSubscription.GetSubscriptionResponse
import com.gu.productmove.zuora.Subscribe.*
import com.gu.productmove.zuora.model.SubscriptionName
import com.gu.productmove.zuora.rest.{ZuoraClientLive, ZuoraGetLive}
import com.gu.productmove.zuora.*
import com.gu.productmove.*
import zio.*
import zio.test.*
import zio.test.Assertion.*

import java.time.LocalDate

object RefundSupporterPlusSpec extends ZIOSpecDefault {
  override def spec: Spec[TestEnvironment & Scope, Any] =
    suite("RefundSupporterPlus")(
      test("Run refund lambda locally") {
        /*
           Test suite used to run the RefundSupporterPlus lambda locally
         */
        for {
          _ <- RefundSupporterPlus
            .applyRefund(
              RefundInput(
                SubscriptionName("A-S00985673"),
                ZuoraAccountId("8ad090fd96d24cc20196d437f54a600f"),
                LocalDate.parse("2025-05-15"),
              ),
            )
            .provide(
              AwsS3Live.layer,
              AwsCredentialsLive.layer,
              SttpClientLive.layer,
              ZuoraClientLive.layer,
              ZuoraGetLive.layer,
              GuStageLive.layer,
              InvoicingApiRefundLive.layer,
              CreditBalanceAdjustmentLive.layer,
              InvoiceItemQueryLive.layer,
              GetInvoiceLive.layer,
              InvoiceItemAdjustmentLive.layer,
              SecretsLive.layer,
              RunBillingLive.layer,
              PostInvoicesLive.layer,
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
            .applyRefund(
              RefundInput(SubscriptionName("A-S00629631"), ZuoraAccountId("choose your id here"), LocalDate.now()),
            )
            .provide(
              AwsS3Live.layer,
              AwsCredentialsLive.layer,
              SttpClientLive.layer,
              ZuoraClientLive.layer,
              ZuoraGetLive.layer,
              GuStageLive.layer,
              ZLayer.succeed(new MockInvoicingApiRefund()),
              CreditBalanceAdjustmentLive.layer,
              InvoiceItemQueryLive.layer,
              GetInvoiceLive.layer,
              InvoiceItemAdjustmentLive.layer,
              SecretsLive.layer,
              RunBillingLive.layer,
              PostInvoicesLive.layer,
            )
        } yield assert(true)(equalTo(true))
      } @@ TestAspect.ignore,
    )
}
