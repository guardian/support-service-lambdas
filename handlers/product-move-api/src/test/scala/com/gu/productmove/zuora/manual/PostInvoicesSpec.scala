package com.gu.productmove.zuora.manual

import com.gu.productmove.GuStageLive.Stage
import com.gu.productmove.zuora.RunBilling.InvoiceId
import com.gu.productmove.zuora.{PostInvoicesLive, TermRenewalLive}
import com.gu.productmove.zuora.model.SubscriptionName
import com.gu.productmove.zuora.rest.{ZuoraClientLive, ZuoraGet, ZuoraGetLive}
import com.gu.productmove.{AwsCredentialsLive, GuStageLive, SecretsLive, SttpClientLive}
import zio.*

import java.time.LocalDate

object PostInvoicesSpec extends ZIOAppDefault {

  def run: Task[Unit] =
    (for {
      zuoraClient <- ZIO.service[ZuoraGet]
      response <- PostInvoicesLive(zuoraClient).postInvoices(
        InvoiceId("8ad083f096d239110196d438cee520d5"),
        LocalDate.now(),
      )
      _ <- ZIO.log(s"response: $response")
    } yield ())
      .provide(
        ZuoraClientLive.layer,
        SttpClientLive.layer,
        ZuoraGetLive.layer,
        SecretsLive.layer,
        AwsCredentialsLive.layer,
        GuStageLive.layer,
      )

}
