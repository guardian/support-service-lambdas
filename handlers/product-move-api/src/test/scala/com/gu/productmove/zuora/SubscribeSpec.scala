package com.gu.productmove.zuora

import com.gu.productmove.{AwsCredentialsLive, AwsS3Live, GuStageLive, SttpClientLive}
import com.gu.productmove.endpoint.available.{Billing, Currency, MoveToProduct, Offer, TimePeriod, TimeUnit, Trial}
import com.gu.productmove.zuora.GetSubscription
import com.gu.productmove.zuora.Subscribe
import com.gu.productmove.zuora.GetSubscription.GetSubscriptionResponse
import com.gu.productmove.zuora.rest.{
  ZuoraClientLive,
  ZuoraGetLive,
  ZuoraRatePlan,
  ZuoraRatePlanCharge,
  ZuoraSubscription
}
import zio.{IO, ZIO}
import zio.*
import zio.test.Assertion.*
import zio.test.*

import java.time.*

object SubscribeSpec extends ZIOSpecDefault {
  private val time = OffsetDateTime.of(LocalDateTime.of(2022, 5, 16, 10, 2), ZoneOffset.ofHours(0))

  override def spec: Spec[TestEnvironment with Scope, Any] =
    suite("subscribe layer")(
      test("createRequest function: JSON request body is created correctly") {
        val time = OffsetDateTime.of(LocalDateTime.of(2022, 5, 10, 10, 2), ZoneOffset.ofHours(0))
      val expectedRequestBody = "{\"accountKey\":\"zuoraAccountId\",\"autoRenew\":true,\"contractEffectiveDate\":\"2022-05-10\",\"customerAcceptanceDate\":\"2022-05-26\",\"termType\":\"TERMED\",\"renewalTerm\":12,\"initialTerm\":12,\"subscribeToRatePlans\":[{\"productRatePlanId\":\"targetProductId\",\"chargeOverrides\":[]}],\"AcquisitionCase__c\":\"case\",\"AcquisitionSource__c\":\"product-movement\",\"CreatedByCSR__c\":\"na\"}"

      for {
        _ <- TestClock.setDateTime(time)
        createRequestBody <- Subscribe
          .createRequestBody("zuoraAccountId", "targetProductId")
          .provide(
            AwsS3Live.layer,
            AwsCredentialsLive.layer,
            SttpClientLive.layer,
            ZuoraClientLive.layer,
            SubscribeLive.layer,
            ZuoraGetLive.layer,
            GuStageLive.layer
          )
      } yield assert(createRequestBody)(equalTo(expectedRequestBody))
    })
}
