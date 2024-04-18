package com.gu.productmove.zuora

import com.gu.productmove.GuStageLive.Stage
import com.gu.productmove.zuora.model.SubscriptionName
import com.gu.productmove.zuora.rest.{ZuoraClientLive, ZuoraGet, ZuoraGetLive}
import com.gu.productmove.{AwsCredentialsLive, GuStageLive, SecretsLive, SttpClientLive}
import zio.*

object TermRenewalSpec extends ZIOAppDefault {

  def run: Task[Unit] =
    (for {
      zuoraGet <- ZIO.service[ZuoraGet]
      response <- TermRenewalLive(zuoraGet)
        .renewSubscription(SubscriptionName("A-S00688596"), true)
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
