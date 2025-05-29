package com.gu.productmove.zuora.manual

import com.gu.productmove.*
import com.gu.productmove.GuStageLive.Stage
import com.gu.productmove.endpoint.available.*
import com.gu.productmove.endpoint.move.ProductMoveEndpoint
import com.gu.productmove.endpoint.move.ProductMoveEndpointTypes.ExpectedInput
import com.gu.productmove.invoicingapi.InvoicingApiRefundLive
import com.gu.productmove.refund.*
import com.gu.productmove.zuora.*
import com.gu.productmove.zuora.GetSubscription.GetSubscriptionResponse
import com.gu.productmove.zuora.InvoiceItemAdjustment.InvoiceItemAdjustmentResult
import com.gu.productmove.zuora.Subscribe.*
import com.gu.productmove.zuora.model.InvoiceId
import com.gu.productmove.zuora.rest.{ZuoraClientLive, ZuoraGetLive}
import zio.*
import zio.json.JsonDecoder
import zio.test.*
import zio.test.Assertion.*

import java.time.*

object RunInvoiceItemAdjustmentLocally extends ZIOAppDefault {
  def run =
    for {
      _ <- TestClock.setTime(LocalDateTime.now.toInstant(ZoneOffset.UTC))
      _ <- InvoiceItemAdjustment
        .update(
          invoiceId = InvoiceId("8ad09b2186bfd8100186c73164d82886"),
          amount = 11.43,
          invoiceItemId = "8ad09b2186bfd8100186c73164e92887",
          "Charge",
        )
        .provide(
          SttpClientLive.layer,
          ZuoraClientLive.layer,
          ZuoraGetLive.layer,
          InvoiceItemAdjustmentLive.layer,
          SecretsLive.layer,
          AwsCredentialsLive.layer,
          GuStageLive.layer,
        )
    } yield ()
}
