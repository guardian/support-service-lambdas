package com.gu.digitalSubscriptionExpiry

import com.gu.cas.SevenDay
import org.scalatest.FlatSpec
import org.scalatest.Matchers._
import play.api.libs.json.Json
import org.joda.time.format.DateTimeFormat
class DigitalSubscriptionExpiryResponseTest extends FlatSpec {

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

    val formatter = DateTimeFormat.forPattern("dd/MM/yyyy")
    val expiryValue = formatter.parseDateTime("26/10/1985")
    val res = SuccessResponse(Expiry(
      expiryDate = expiryValue,
      expiryType = "ExpiryTypeValue",
      content = "ContentValue",
      subscriptionCode = Some(SevenDay),
      provider = Some("ProviderValue")
    ))

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
      code = -789
    )

    val jsonRes = Json.toJson(res)
    jsonRes should be(expectedJson)
  }
}
