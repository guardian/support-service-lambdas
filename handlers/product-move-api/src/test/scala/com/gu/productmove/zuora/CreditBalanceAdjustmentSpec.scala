package com.gu.productmove.zuora

import com.gu.productmove.{AwsCredentialsLive, AwsS3Live, GuStageLive, SttpClientLive}
import com.gu.productmove.invoicingapi.InvoicingApiRefundLive
import com.gu.productmove.refund.{Refund, RefundInput}
import com.gu.productmove.zuora.RefundSpec.{suite, test}
import com.gu.productmove.zuora.rest.{ZuoraClientLive, ZuoraGetLive}
import zio.Scope
import zio.test.Assertion.equalTo
import zio.test.{Spec, TestAspect, TestEnvironment, ZIOSpecDefault, assert}

object CreditBalanceAdjustmentSpec extends ZIOSpecDefault {
  override def spec: Spec[TestEnvironment with Scope, Any] =
    suite("Credit balance adjustment")(
      test("Run CreditBalanceAdjustment increase locally") {
        val amount = 27.86
        val negativeInvoiceId = "8ad0889d86bb645e0186bce2e9f86afb"
        for {
          _ <- CreditBalanceAdjustment
            .adjust(
              amount,
              s"[Product-switching] Transfer $amount from negative invoice $negativeInvoiceId to the account balance",
              negativeInvoiceId,
              "Increase",
            )
            .provide(
              CreditBalanceAdjustmentLive.layer,
              ZuoraGetLive.layer,
              ZuoraClientLive.layer,
              SttpClientLive.layer,
            )
        } yield assert(true)(equalTo(true))
      },
      test("Run CreditBalanceAdjustment decrease locally") {
        val amount = 20
        val invoiceId = "8ad09b2186bb70ab0186bcde997f4e0b"
        for {
          _ <- CreditBalanceAdjustment
            .adjust(
              amount,
              s"[Product-switching] Transfer $amount from credit balance to invoice $invoiceId",
              invoiceId,
              "Decrease",
            )
            .provide(
              CreditBalanceAdjustmentLive.layer,
              ZuoraGetLive.layer,
              ZuoraClientLive.layer,
              SttpClientLive.layer,
            )
        } yield assert(true)(equalTo(true))
      } @@ TestAspect.ignore,
    )
}
