package com.gu.productmove.zuora

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

object SubscribeSpec extends ZIOSpecDefault {
  private val time = OffsetDateTime.of(LocalDateTime.of(2022, 5, 16, 10, 2), ZoneOffset.ofHours(0))

  override def spec: Spec[TestEnvironment with Scope, Any] =
    suite("subscribe layer")(test("createRequest function: JSON request body is created and encoded correctly") {
      val time = OffsetDateTime.of(LocalDateTime.of(2022, 5, 10, 10, 2), ZoneOffset.ofHours(0))
      val expectedSubscribeRequest = SubscribeRequest(
        accountKey = "zuoraAccountId",
        contractEffectiveDate = LocalDate.of(2022, 5, 10),
        customerAcceptanceDate = LocalDate.of(2022, 5, 10),
        AcquisitionCase__c = "case",
        AcquisitionSource__c = "product-movement",
        CreatedByCSR__c = "na",
        subscribeToRatePlans = List(SubscribeToRatePlans(productRatePlanId = "targetProductId"))
      )

      for {
        _ <- TestClock.setDateTime(time)
        createRequestBody <- SubscribeRequest.withTodaysDate("zuoraAccountId", "targetProductId")
      } yield assert(createRequestBody)(equalTo(expectedSubscribeRequest))
    })
}
