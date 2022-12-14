package test.scala.com.gu.digitalSubscriptionExpiry

import com.gu.digitalSubscriptionExpiry.DigitalSubscriptionExpiryRequest
import org.scalatest.matchers.should.Matchers._
import play.api.libs.json.{JsResult, JsSuccess, Json}
import org.scalatest.matchers
import org.scalatest.flatspec.AnyFlatSpec

class DigitalSubscriptionExpiryRequestTest extends AnyFlatSpec {

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
        password = Some("abc 123"),
      ),
    )

    val event: JsResult[DigitalSubscriptionExpiryRequest] =
      Json.parse(validSubsAuthorisationRequest).validate[DigitalSubscriptionExpiryRequest]

    event should be(expected)
  }

}
