package com.gu.productmove.zuora

import com.gu.productmove.GuStageLive.Stage
import com.gu.productmove.endpoint.available.*
import com.gu.productmove.endpoint.move.ProductMoveEndpoint
import com.gu.productmove.endpoint.move.ProductMoveEndpointTypes.ExpectedInput
import com.gu.productmove.invoicingapi.InvoicingApiRefundLive
import com.gu.productmove.refund.*
import com.gu.productmove.zuora.GetSubscription
import com.gu.productmove.zuora.GetSubscription.GetSubscriptionResponse
import com.gu.productmove.zuora.Subscribe.*
import com.gu.productmove.zuora.rest.{ZuoraClientLive, ZuoraGetLive}
import com.gu.productmove.*
import zio.test.*
import zio.test.Assertion.*
import zio.*

import java.time.*

object InvoiceItemAdjustmentSpec extends ZIOSpecDefault {
  override def spec: Spec[TestEnvironment with Scope, Any] =
    suite("InvoiceItemAdjustment")(test("Run InvoiceItemAdjustment locally") {
      for {
        _ <- TestClock.setTime(LocalDateTime.now.toInstant(ZoneOffset.UTC))
        _ <- InvoiceItemAdjustment
          .update(
            invoiceId = "8ad09b2186bfd8100186c73164d82886",
            amount = 11.43,
            invoiceItemId = "8ad09b2186bfd8100186c73164e92887",
          )
          .provide(
            SttpClientLive.layer,
            ZuoraClientLive.layer,
            ZuoraGetLive.layer,
            InvoiceItemAdjustmentLive.layer,
            SecretsLive.layer
          )
      } yield assert(true)(equalTo(true))
    } @@ TestAspect.ignore)
}
