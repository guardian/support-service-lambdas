package com.gu.digitalSubscriptionExpiry.zuora
import com.gu.digitalSubscriptionExpiry.zuora.GetSubscription._
import org.joda.time.DateTime
import org.scalatest.FlatSpec
import org.scalatest.Matchers._
import play.api.libs.json._

class GetSubscriptionReaderTest extends FlatSpec {
  "GetSubscription" should "deserialise correctly a valid response from Zuora" in {
    val subscriptionStream = getClass.getResourceAsStream("/digitalSubscriptionExpiry/validSubscription.json")

    val theDate = Some(new DateTime().withYear(2018).withMonthOfYear(3).withDayOfMonth(20).withTimeAtStartOfDay())
    val expected = JsSuccess(
      SubscriptionResult(
        id = SubscriptionId("A-S00044860"),
        name = SubscriptionName("2c92c0f9624bbc6c016253a4c4df5023"),
        casActivationDate = None,
        startDate = theDate,
        endDate = theDate map (_.plusMonths(1)),
        customerAcceptanceDate = theDate,
        ratePlans = List(RatePlan("Digital Pack Monthly"))
      )
    )
    val subscription = Json.parse(subscriptionStream).validate[SubscriptionResult]
    subscription should be(expected)
  }

}

