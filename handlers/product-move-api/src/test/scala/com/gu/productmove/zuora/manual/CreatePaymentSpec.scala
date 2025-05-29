package com.gu.productmove.zuora.manual

import com.gu.productmove.*
import com.gu.productmove.zuora.model.InvoiceId
import com.gu.productmove.zuora.rest.{ZuoraClientLive, ZuoraGetLive}
import com.gu.productmove.zuora.{CreatePayment, CreatePaymentLive, ZuoraAccountId}
import zio.*
import zio.test.*
import zio.test.Assertion.*

import java.time.*

object CreatePaymentSpec extends ZIOAppDefault {

  def run: Task[Unit] =
    for {
      _ <- CreatePayment
        .create(
          accountId = ZuoraAccountId("8ad09be48bae944c018baf50186850a5"),
          invoiceId = InvoiceId("8ad087d28bb86b72018bb9e90bad101d"),
          paymentMethodId = "8ad09be48bae944c018baf50189950aa",
          amount = 45.270000000,
          today = LocalDate.now(),
        )
        .provide(
          ZuoraGetLive.layer,
          ZuoraClientLive.layer,
          CreatePaymentLive.layer,
          SttpClientLive.layer,
          SecretsLive.layer,
          AwsCredentialsLive.layer,
          GuStageLive.layer,
        )

    } yield ()

}
