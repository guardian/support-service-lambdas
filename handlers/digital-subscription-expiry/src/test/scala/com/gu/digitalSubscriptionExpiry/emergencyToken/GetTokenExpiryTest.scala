package com.gu.digitalSubscriptionExpiry.emergencyToken

import java.time.LocalDate
import com.gu.cas.{PrefixedTokens, SevenDay, TokenPayload}
import com.gu.digitalSubscriptionExpiry.responses.{Expiry, ExpiryType, SuccessResponse}
import com.gu.util.apigateway.ResponseModels.ApiResponse
import play.api.libs.json.Json
import com.gu.util.reader.Types.ApiGatewayOp.{ReturnWithResponse, ContinueProcessing}
import org.joda.time.{Days, Weeks}
import org.scalatest.flatspec.AnyFlatSpec
import org.scalatest.matchers.should.Matchers

class GetTokenExpiryTest extends AnyFlatSpec with Matchers {

  val getTokenExpiry = {
    val codec = PrefixedTokens(secretKey = "secret", emergencySubscriberAuthPrefix = "G99")
    GetTokenExpiry(EmergencyTokens("G99", codec), () => LocalDate.of(2018, 5, 1))(_)
  }

  it should "return right for invalid token" in {
    getTokenExpiry("invalidToken").shouldBe(ContinueProcessing(()))
  }
  it should "read valid token in the second era" in {

    val expectedResponse =
      expectedExpiryForDate(LocalDate.of(2018, 5, 23))

    getTokenExpiry("G99HXJLJHOCN").shouldBe(expectedResponse)
  }
  it should "read valid token overlapping the eras" in {

    val expectedResponse =
      expectedExpiryForDate(LocalDate.of(2018, 5, 21))

    getTokenExpiry("G99DPZBLIVIIAP").shouldBe(expectedResponse)
  }

  it should "be that a codec with same secret key should encode and decode reflexively" in {
    // replace "secret" with the prod secret to get a code that'll work with https://content-auth.guardian.co.uk/subs
    val codec = PrefixedTokens(secretKey = "secret", emergencySubscriberAuthPrefix = "G99")
    val tokenPayload = TokenPayload.apply(org.joda.time.LocalDate.now())(Weeks.weeks(51), SevenDay)
    val encoded = codec.encode(tokenPayload)
    // to see the generated code: println(encoded)
    val expectedResponse = expectedExpiryForDate(LocalDate.now().plusWeeks(51).plusDays(1))
    GetTokenExpiry(
      EmergencyTokens("G99", codec),
      () => LocalDate.now()
    )(encoded).shouldBe(expectedResponse)
  }

  private def expectedExpiryForDate(expiryDate: LocalDate) = {
    val expiry = Expiry(
      expiryDate = expiryDate,
      expiryType = ExpiryType.SUB,
      subscriptionCode = Some(SevenDay),
      provider = Some("G99"),
    )

    val responseBody = Json.prettyPrint(Json.toJson(SuccessResponse(expiry)))
    ReturnWithResponse(ApiResponse("200", responseBody))
  }
}
