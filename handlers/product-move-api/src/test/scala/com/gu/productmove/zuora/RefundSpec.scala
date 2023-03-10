package com.gu.productmove.zuora

import com.gu.productmove.GuStageLive.Stage
import com.gu.productmove.refund.*
import com.gu.productmove.{AwsCredentialsLive, AwsS3Live, SQSLive, GuStageLive, SttpClientLive}
import com.gu.productmove.endpoint.available.{Billing, Currency, MoveToProduct, Offer, TimePeriod, TimeUnit, Trial}
import com.gu.productmove.endpoint.move.ProductMoveEndpoint
import com.gu.productmove.endpoint.move.ProductMoveEndpointTypes.ExpectedInput
import com.gu.productmove.invoicingapi.InvoicingApiRefundLive
import com.gu.productmove.zuora.GetSubscription
import com.gu.productmove.zuora.Subscribe.*
import com.gu.productmove.zuora.GetSubscription.GetSubscriptionResponse
import com.gu.productmove.zuora.rest.{ZuoraClientLive, ZuoraGetLive}
import zio.{IO, ZIO}
import zio.*
import zio.test.Assertion.*
import zio.test.*

import java.time.*

object RefundSpec extends ZIOSpecDefault {
  override def spec: Spec[TestEnvironment with Scope, Any] =
    suite("Refund")(test("Run refund lambda locally") {
      /*
           Test suite used to run the refund lambda locally
       */
      for {
        _ <- Refund
          .applyRefund(RefundInput("A-S00497072"))
          .provide(
            AwsS3Live.layer,
            AwsCredentialsLive.layer,
            SttpClientLive.layer,
            ZuoraClientLive.layer,
            ZuoraGetLive.layer,
            GuStageLive.layer,
            InvoicingApiRefundLive.layer,
            CreditBalanceAdjustmentLive.layer,
            GetInvoiceItemsForSubscriptionLive.layer,
            GetInvoiceLive.layer,
            GetInvoiceItemsLive.layer,
            InvoiceItemAdjustmentLive.layer,
          )
      } yield assert(true)(equalTo(true))
    }  @@ TestAspect.ignore)
}
