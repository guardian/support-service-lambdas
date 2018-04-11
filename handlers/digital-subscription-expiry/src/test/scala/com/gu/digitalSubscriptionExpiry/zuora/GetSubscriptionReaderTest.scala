package com.gu.digitalSubscriptionExpiry.zuora

import com.gu.digitalSubscriptionExpiry.zuora.GetAccountSummary.AccountId
import com.gu.digitalSubscriptionExpiry.zuora.GetSubscription._
import org.joda.time.format.DateTimeFormat
import org.scalatest.FlatSpec
import org.scalatest.Matchers._
import play.api.libs.json._

class GetSubscriptionReaderTest extends FlatSpec {

  val dateFormatter = DateTimeFormat.forPattern("dd/MM/yyyy")

  def asDate(str: String) = dateFormatter.parseLocalDate(str)

  "GetSubscription" should "deserialise correctly a valid response from Zuora" in {
    val subscriptionStream = getClass.getResourceAsStream("/digitalSubscriptionExpiry/validSubscription.json")

    val charges = List(RatePlanCharge(
      effectiveStartDate = asDate("20/03/2018"),
      effectiveEndDate = asDate("20/04/2018")
    ))
    val expected = JsSuccess(
      SubscriptionResult(
        id = SubscriptionId("A-S00044860"),
        name = SubscriptionName("2c92c0f9624bbc6c016253a4c4df5023"),
        accountId = AccountId("2c92c0f86078c4d4016079e1402d6536"),
        casActivationDate = None,
        startDate = asDate("20/03/2018"),
        endDate = asDate("20/04/2018"),
        customerAcceptanceDate = asDate("20/03/2018"),
        ratePlans = List(RatePlan("Digital Pack Monthly", charges))
      )
    )
    val subscription = Json.parse(subscriptionStream).validate[SubscriptionResult]
    subscription should be(expected)
  }

}

