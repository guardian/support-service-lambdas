package com.gu.digitalSubscriptionExpiry.emergencyToken

import com.gu.cas.{PrefixedTokens, SevenDay}
import com.gu.digitalSubscriptionExpiry.{Expiry, ExpiryType}
import org.joda.time.format.DateTimeFormat
import org.scalatest.{FlatSpec, Matchers}

class GetTokenExpiryTest extends FlatSpec with Matchers {

  val getTokenExpiry = {
    val codec = PrefixedTokens(secretKey = "secret", emergencySubscriberAuthPrefix = "G99")
    GetTokenExpiry(EmergencyTokens("G99", codec))(_)
  }

  it should "return none for invalid token" in {
    getTokenExpiry("invalidToken").shouldBe(None)
  }
  it should "read valid token" in {

    val dateFormatter = DateTimeFormat.forPattern("dd/MM/yyyy")

    val expiry = Expiry(
      expiryDate = dateFormatter.parseDateTime("21/07/2017"),
      expiryType = ExpiryType.SUB,
      subscriptionCode = Some(SevenDay),
      provider = Some("G99")
    )

    val expectedResponse = Some(expiry)
    val actual = getTokenExpiry("G99IZXCEZLYF")

    val actualNoTime = actual.map(x =>
      x.expiry.copy(expiryDate = x.expiry.expiryDate.withTime(0, 0, 0, 0)))

    actualNoTime.shouldBe(expectedResponse)
  }
}

