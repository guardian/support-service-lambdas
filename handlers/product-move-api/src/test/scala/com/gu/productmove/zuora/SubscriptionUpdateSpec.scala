package com.gu.productmove.zuora

import com.gu.newproduct.api.productcatalog.Monthly
import com.gu.productmove.GuStageLive.Stage
import com.gu.productmove.{AwsCredentialsLive, AwsS3Live, GuStageLive, SttpClientLive}
import com.gu.productmove.endpoint.available.{Billing, Currency, MoveToProduct, Offer, TimePeriod, TimeUnit, Trial}
import com.gu.productmove.zuora.GetSubscription
import com.gu.productmove.zuora.Subscribe.*
import com.gu.productmove.zuora.GetSubscription.GetSubscriptionResponse
import com.gu.productmove.zuora.rest.{ZuoraClientLive, ZuoraGetLive}
import zio.{IO, ZIO}
import zio.*
import zio.test.Assertion.*
import zio.test.*

import java.time.*

object SubscriptionUpdateSpec extends ZIOSpecDefault {

  override def spec: Spec[TestEnvironment with Scope, Any] =
    suite("subscription update service")(
      test("JSON request body is created and encoded correctly (DEV)") {
        val timeLocalDate = LocalDate.of(2022, 5, 10)
        val time = OffsetDateTime.of(LocalDateTime.of(2022, 5, 10, 10, 2), ZoneOffset.ofHours(0)).toInstant

        val expectedRequestBody = SubscriptionUpdateRequest(
          add = List(AddRatePlan(
            contractEffectiveDate = timeLocalDate,
            productRatePlanId = "8ad09fc281de1ce70181de3b251736a4",
            chargeOverrides = List(ChargeOverrides(
              price = Some(50.00),
              productRatePlanChargeId = "8ad09fc281de1ce70181de3b253e36a6"
            ))
          )),
          remove = List(RemoveRatePlan(
            contractEffectiveDate = timeLocalDate,
            ratePlanId = "8ad03sdfa1312f3123"
          ))
        )

        for {
          _ <- TestClock.setTime(time)
          createRequestBody <- SubscriptionUpdateRequest(Monthly, "8ad03sdfa1312f3123", "50").provideLayer(ZLayer.succeed(Stage.valueOf("DEV")))
        } yield assert(createRequestBody)(equalTo(expectedRequestBody))
      },

      test("JSON request body is created and encoded correctly (PROD)") {
        val timeLocalDate = LocalDate.of(2022, 5, 10)
        val time = OffsetDateTime.of(LocalDateTime.of(2022, 5, 10, 10, 2), ZoneOffset.ofHours(0)).toInstant

        val expectedRequestBody = SubscriptionUpdateRequest(
          add = List(AddRatePlan(
            contractEffectiveDate = timeLocalDate,
            productRatePlanId = "8a12865b8219d9b401822106192b64dc",
            chargeOverrides = List(ChargeOverrides(
              price = Some(50.00),
              productRatePlanChargeId = "8a12865b8219d9b401822106194e64e3"
            ))
          )),
          remove = List(RemoveRatePlan(
            contractEffectiveDate = timeLocalDate,
            ratePlanId = "8ad03sdfa1312f3123"
          ))
        )

        for {
          _ <- TestClock.setTime(time)
          createRequestBody <- SubscriptionUpdateRequest(Monthly, "8ad03sdfa1312f3123", "50").provideLayer(ZLayer.succeed(Stage.valueOf("PROD")))
        } yield assert(createRequestBody)(equalTo(expectedRequestBody))
      },

    )

}
