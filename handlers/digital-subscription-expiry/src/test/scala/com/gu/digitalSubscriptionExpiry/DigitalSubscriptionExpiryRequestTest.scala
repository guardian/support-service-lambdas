package test.scala.com.gu.digitalSubscriptionExpiry

import main.scala.com.gu.digitalSubscriptionExpiry.DigitalSubscriptionExpiryRequest
import org.scalatest.FlatSpec
import org.scalatest.Matchers._
import play.api.libs.json.{JsResult, JsSuccess, Json}

class DigitalSubscriptionExpiryRequestTest extends FlatSpec {

  "DigitalSubscriptionExpiryRequest" should "deserialise correctly from a valid request" in {

    val validSubsAuthorisationRequest =
      """
        |{
        |    "appId": "TEST TEST TEST",
        |    "deviceId": "my device",
        |    "subscriberId": "A-SOMESTUFF",
        |    "password": "abc 123"
        |}
      """.stripMargin

    val expected: JsResult[DigitalSubscriptionExpiryRequest] = JsSuccess(
      DigitalSubscriptionExpiryRequest(
        subscriberId = "A-SOMESTUFF",
        password = "abc 123"
      )
    )

    val event: JsResult[DigitalSubscriptionExpiryRequest] = Json.parse(validSubsAuthorisationRequest).validate[DigitalSubscriptionExpiryRequest]

    event should be(expected)
  }

}
