package com.gu.autoCancel

import com.gu.util.TrustedApiConfig
import com.gu.util.apigateway.ApiGatewayResponse._
import com.gu.util.apigateway.{ ApiGatewayHandler, ApiGatewayRequest, RequestAuth }
import org.scalatest._
import play.api.libs.json.{ JsSuccess, Json }

import scalaz.{ -\/, \/- }
object AutoCancelHandlerTest {

  def fakeCallout(autoPay: Boolean) = {
    AutoCancelCallout(accountId = "id123", autoPay = s"$autoPay", paymentMethodType = "PayPal", email = "hi@hi.com", firstName = "john", lastName = "bloggs", creditCardType = "",
      creditCardExpirationMonth = "", creditCardExpirationYear = "", invoiceId = "idid",
      currency = "GBP")
  }

}
class AutoCancelHandlerTest extends FlatSpec {

  import AutoCancelInputFilter._
  import AutoCancelHandlerTest._

  "filterInvalidAccount" should "return a left if AutoPay = false" in {
    val autoCancelCallout = fakeCallout(false)
    val either = apply(autoCancelCallout, false)
    assert(either match {
      case -\/(_) => true
      case _ => false
    }, s"We got: $either")
  }

  "filterInvalidAccount" should "return a right if AutoPay = true" in {
    val autoCancelCallout = fakeCallout(true)
    val either = apply(autoCancelCallout, false)
    assert(either match {
      case \/-(_) => true
      case _ => false
    }, s"We got: $either")
  }

  "filterDirectDebit" should "return a left if we're only cancelling direct debits, but the sub isn't paid that way" in {
    val either = filterDirectDebit(onlyCancelDirectDebit = true, nonDirectDebit = true)
    assert(either match {
      case -\/(_) => true
      case _ => false
    }, s"We got: $either")
  }

  "filterDirectDebit" should "return a right if we're not just cancelling direct debits even if it's not paid by DD" in {
    val either = filterDirectDebit(onlyCancelDirectDebit = false, nonDirectDebit = true)
    assert(either match {
      case \/-(_) => true
      case _ => false
    }, s"We got: $either")
  }

  "filterDirectDebit" should "return a right if we're only cancelling DDs and it is a direct debit" in {
    val either = filterDirectDebit(onlyCancelDirectDebit = true, nonDirectDebit = false)
    assert(either match {
      case \/-(_) => true
      case _ => false
    }, s"We got: $either")
  }

  "authenticateCallout" should "return a left if the credentials are invalid" in {
    val requestAuth = RequestAuth(apiClientId = "correctId", apiToken = "token")
    val trustedApiConfig = TrustedApiConfig(apiClientId = "wrongId", apiToken = "token", tenantId = "tenant")
    assert(ApiGatewayHandler.authenticateCallout(Some(requestAuth), trustedApiConfig) == -\/(unauthorized))
  }

  "authenticateCallout" should "return a right if the credentials are valid" in {
    val requestAuth = RequestAuth(apiClientId = "correctId", apiToken = "token")
    val trustedApiConfig = TrustedApiConfig(apiClientId = "correctId", apiToken = "token", tenantId = "tenant")
    assert(ApiGatewayHandler.authenticateCallout(Some(requestAuth), trustedApiConfig) == \/-(()))
  }

}

class DeserialiserTest extends FlatSpec with Matchers {

  "deserialise APIGatewayRequest" should "manage without the only direct debit param" in {
    val json = """{"queryStringParameters": {"apiToken": "a", "apiClientId": "b"}, "body": "haha"}"""
    val actualRequest = Json.parse(json).validate[ApiGatewayRequest]

    actualRequest.map(_.queryStringParameters.flatMap(_.onlyCancelDirectDebit)) should be(JsSuccess(None))

  }

  it should "manage with the only direct debit param being false" in {
    val json = """{"queryStringParameters": {"apiToken": "a", "apiClientId": "b", "onlyCancelDirectDebit": "false"}, "body": "haha"}"""
    val actualRequest = Json.parse(json).validate[ApiGatewayRequest]

    actualRequest.map(_.onlyCancelDirectDebit) should be(JsSuccess(false))

  }

  it should "manage with the only direct debit param being true" in {
    val json = """{"queryStringParameters": {"apiToken": "a", "apiClientId": "b", "onlyCancelDirectDebit": "true"}, "body": "haha"}"""
    val actualRequest = Json.parse(json).validate[ApiGatewayRequest]

    actualRequest.map(_.onlyCancelDirectDebit) should be(JsSuccess(true))

  }

}
