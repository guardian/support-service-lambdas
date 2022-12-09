package com.gu.digitalSubscriptionExpiry.zuora

import java.time.LocalDate

import com.gu.digitalSubscriptionExpiry.zuora.GetAccountSummary.AccountId
import com.gu.digitalSubscriptionExpiry.zuora.GetSubscription._
import org.scalatest.matchers.should.Matchers._
import play.api.libs.json._
import org.scalatest.matchers
import org.scalatest.flatspec.AnyFlatSpec

class GetSubscriptionReaderTest extends AnyFlatSpec {

  "GetSubscription" should "deserialise correctly a valid response from Zuora" in {
    val subscriptionStream = getClass.getResourceAsStream("/digitalSubscriptionExpiry/validSubscription.json")

    val charges = List(
      RatePlanCharge(
        name = "Digital Pack Monthly",
        effectiveStartDate = LocalDate.of(2018, 3, 20),
        effectiveEndDate = LocalDate.of(2018, 4, 20),
      ),
    )
    val expected = JsSuccess(
      SubscriptionResult(
        id = SubscriptionId("A-S00044860"),
        name = SubscriptionName("2c92c0f9624bbc6c016253a4c4df5023"),
        accountId = AccountId("2c92c0f86078c4d4016079e1402d6536"),
        casActivationDate = None,
        startDate = LocalDate.of(2018, 3, 20),
        endDate = LocalDate.of(2018, 4, 20),
        customerAcceptanceDate = LocalDate.of(2018, 3, 20),
        ratePlans = List(RatePlan("Digital Pack", charges)),
      ),
    )
    val subscription = Json.parse(subscriptionStream).validate[SubscriptionResult]
    subscription should be(expected)
  }

}
