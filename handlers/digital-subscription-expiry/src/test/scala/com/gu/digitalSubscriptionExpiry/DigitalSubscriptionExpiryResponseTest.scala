package com.gu.digitalSubscriptionExpiry

import java.time.LocalDate
import com.gu.cas.SevenDay
import com.gu.digitalSubscriptionExpiry.responses.{ErrorResponse, Expiry, SuccessResponse}
import org.scalatest.matchers.should.Matchers._
import play.api.libs.json.Json
import org.scalatest.matchers
import org.scalatest.flatspec.AnyFlatSpec

class DigitalSubscriptionExpiryResponseTest extends AnyFlatSpec {

  it should "serialise success response" in {

    val expectedstr =
      """{
 |        "expiry" : {
 |        "expiryDate" : "1985-10-26",
 |        "expiryType" : "ExpiryTypeValue",
 |        "content" : "ContentValue",
 |        "subscriptionCode" : "SevenDay",
 |        "provider" : "ProviderValue"
 |          }
 |        }""".stripMargin
    val expectedJson = Json.parse(expectedstr)

    val expiryValue = LocalDate.of(1985, 10, 26)
    val res = SuccessResponse(
      Expiry(
        expiryDate = expiryValue,
        expiryType = "ExpiryTypeValue",
        content = "ContentValue",
        subscriptionCode = Some(SevenDay),
        provider = Some("ProviderValue"),
      ),
    )

    val jsonRes = Json.toJson(res)
    jsonRes should be(expectedJson)
  }

  it should "serialise correctly " in {

    val expectedstr =
      """{
        |    "error": {
        |        "message": "some error message",
        |        "code": -789
        |    }
        |        }""".stripMargin
    val expectedJson = Json.parse(expectedstr)

    val res = ErrorResponse(
      message = "some error message",
      code = -789,
    )

    val jsonRes = Json.toJson(res)
    jsonRes should be(expectedJson)
  }
}
