package test.scala.com.gu.digitalSubscriptionExpiry

import main.scala.com.gu.digitalSubscriptionExpiry.DigitalSubscriptionExpiryCallout
import org.scalatest.FlatSpec
import org.scalatest.Matchers._
import play.api.libs.json.{JsResult, JsSuccess, Json}

class DigitalSubscriptionExpiryCalloutTest extends FlatSpec {

  "DigitalSubscriptionExpiryCallout" should "deserialise correctly from a valid callout" in {

    val validSubsAuthorisationCallout =
      """
        |{
        |    "appId": "TEST TEST TEST",
        |    "deviceId": "my device",
        |    "subscriberId": "A-SOMESTUFF",
        |    "password": "abc 123"
        |}
      """.stripMargin

    val expected: JsResult[DigitalSubscriptionExpiryCallout] = JsSuccess(
      DigitalSubscriptionExpiryCallout(
        appId = "TEST TEST TEST",
        deviceId = "my device",
        subscriberId = "A-SOMESTUFF",
        password = "abc 123"
      )
    )

    val event: JsResult[DigitalSubscriptionExpiryCallout] = Json.parse(validSubsAuthorisationCallout).validate[DigitalSubscriptionExpiryCallout]

    event should be(expected)
  }

}
