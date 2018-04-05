package com.gu.digitalSubscriptionExpiry

import org.scalatest.FlatSpec
import org.scalatest.Matchers._
import play.api.libs.json.Json
import org.joda.time.format.DateTimeFormat
class DigitalSubscriptionExpiryResponseTest extends FlatSpec {

  "DigitalSubscriptionExpiryResponse" should "serialise correctly " in {

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
    val res = DigitalSubscriptionExpiryResponse(Expiry(
      expiryDate = expiryValue,
      expiryType = "ExpiryTypeValue",
      content = "ContentValue",
      subscriptionCode = Some(SevenDay),
      provider = Some("ProviderValue")
    ))

    val jsonRes = Json.toJson(res)
    jsonRes should be(expectedJson)
  }

}
