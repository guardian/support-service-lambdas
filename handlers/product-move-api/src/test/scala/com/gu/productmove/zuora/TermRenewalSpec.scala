package com.gu.productmove.zuora

import com.gu.productmove.GuStageLive.Stage
import com.gu.productmove.zuora.model.SubscriptionId
import com.gu.productmove.zuora.rest.{ZuoraClientLive, ZuoraGetLive}
import com.gu.productmove.{SecretsLive, SttpClientLive}
import zio.test.Assertion.equalTo
import zio.test.{Spec, TestAspect, TestClock, TestEnvironment, ZIOSpecDefault, assert}
import zio.{Scope, ZLayer}

import java.time.{LocalDate, ZoneOffset}

object TermRenewalSpec extends ZIOSpecDefault {
  override def spec: Spec[TestEnvironment with Scope, Any] =
    suite("TermRenewal")(
      test("Run TermRenewal locally") {
        for {
          blah <- TermRenewal
            .update[AmendmentResponse](SubscriptionId(""), LocalDate.now)
            .provide(
              ZuoraClientLive.layer,
              SttpClientLive.layer,
              ZuoraGetLive.layer,
              TermRenewalLive.layer,
              SecretsLive.layer,
              ZLayer.succeed(Stage.valueOf("CODE")),
            )
        } yield assert(true)(equalTo(true))
      } @@ TestAspect.ignore,
    )
}
