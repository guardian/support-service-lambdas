package com.gu.digitalSubscriptionExpiry.zuora
import com.gu.digitalSubscriptionExpiry.zuora.GetAccountSummary.AccountId
import com.gu.digitalSubscriptionExpiry.zuora.GetSubscription._
import org.joda.time.{LocalDate}
import org.scalatest.FlatSpec
import org.scalatest.Matchers._
import play.api.libs.json._

class GetSubscriptionReaderTest extends FlatSpec {
  "GetSubscription" should "deserialise correctly a valid response from Zuora" in {
    val subscriptionStream = getClass.getResourceAsStream("/digitalSubscriptionExpiry/validSubscription.json")

    val theDate = new LocalDate().withYear(2018).withMonthOfYear(3).withDayOfMonth(20)
    val expected = JsSuccess(
      SubscriptionResult(
        id = SubscriptionId("A-S00044860"),
        name = SubscriptionName("2c92c0f9624bbc6c016253a4c4df5023"),
        accountId = AccountId("2c92c0f86078c4d4016079e1402d6536"),
        casActivationDate = None,
        startDate = theDate,
        endDate = theDate.plusMonths(1),
        customerAcceptanceDate = theDate,
        ratePlans = List(RatePlan("Digital Pack Monthly", theDate, theDate.plusMonths(2)))
      )
    )
    val subscription = Json.parse(subscriptionStream).validate[SubscriptionResult]
    subscription should be(expected)
  }

}

