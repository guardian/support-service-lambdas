package com.gu.productmove.zuora.manual

import com.gu.productmove.*
import com.gu.productmove.zuora.rest.{ZuoraClientLive, ZuoraGetLive}
import com.gu.productmove.zuora.{CreditBalanceAdjustment, CreditBalanceAdjustmentLive}
import zio.*
import zio.test.Assertion.equalTo
import zio.test.{Spec, TestAspect, TestEnvironment, ZIOSpecDefault, assert}

object CreditBalanceAdjustmentApp extends ZIOAppDefault {
  def run: Task[Unit] = {
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
    } yield ()
  }

}

object RunCreditBalanceAdjustmentDecreaseLocally extends ZIOAppDefault {
  def run: Task[Unit] = {
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
    } yield ()
  }

}
