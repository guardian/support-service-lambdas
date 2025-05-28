package com.gu.productmove.zuora.manual

import com.gu.productmove.invoicingapi.InvoicingApiRefundLive
import com.gu.productmove.refund.{RefundInput, RefundSupporterPlus}
import RefundSupporterPlusSpec.{suite, test}
import com.gu.productmove.zuora.rest.{ZuoraClientLive, ZuoraGetLive}
import com.gu.productmove.zuora.{CreditBalanceAdjustment, CreditBalanceAdjustmentLive}
import com.gu.productmove.*
import zio.*
import zio.test.Assertion.equalTo
import zio.test.{Spec, TestAspect, TestEnvironment, ZIOSpecDefault, assert}

object CreditBalanceAdjustmentSpec extends ZIOSpecDefault {
  override def spec: Spec[TestEnvironment & Scope, Any] =
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
              SecretsLive.layer,
              AwsCredentialsLive.layer,
              GuStageLive.layer,
            )
        } yield assert(true)(equalTo(true))
      } @@ TestAspect.ignore,
      test("Run CreditBalanceAdjustment decrease locally") {
        val amount = 8.57
        val invoiceId = "8ad08dc986bfcd320186c1bf1ed53879"
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
              SecretsLive.layer,
              AwsCredentialsLive.layer,
              GuStageLive.layer,
            )
        } yield assert(true)(equalTo(true))
      } @@ TestAspect.ignore,
    )
}
