package com.gu.autoCancel

import com.gu.autoCancel.AutoCancelSteps.AutoCancelUrlParams
import com.gu.util.apigateway.Auth.RequestAuth
import com.gu.util.apigateway.{ApiGatewayHandler, ApiGatewayRequest}
import com.gu.util.config.TrustedApiConfig
import org.scalatest._
import play.api.libs.json.{JsSuccess, Json}
import scalaz.{-\/, \/-}
object AutoCancelHandlerTest {

  def fakeCallout(autoPay: Boolean) = {
    AutoCancelCallout(accountId = "id123", autoPay = s"$autoPay", paymentMethodType = "PayPal", email = "hi@hi.com", firstName = "john", lastName = "bloggs", creditCardType = "",
      creditCardExpirationMonth = "", creditCardExpirationYear = "", invoiceId = "idid",
      currency = "GBP")
  }

}
class AutoCancelHandlerTest extends FlatSpec {

  import AutoCancelHandlerTest._
  import AutoCancelInputFilter._

  "filterInvalidAccount" should "return a left if AutoPay = false" in {
    val autoCancelCallout = fakeCallout(false)
    val apiGatewayOp = apply(autoCancelCallout, false)
    assert(apiGatewayOp.toDisjunction match {
      case -\/(_) => true
      case _ => false
    }, s"We got: $apiGatewayOp")
  }

  "filterInvalidAccount" should "return a right if AutoPay = true" in {
    val autoCancelCallout = fakeCallout(true)
    val apiGatewayOp = apply(autoCancelCallout, false)
    assert(apiGatewayOp.toDisjunction match {
      case \/-(_) => true
      case _ => false
    }, s"We got: $apiGatewayOp")
  }

  "filterDirectDebit" should "return a left if we're only cancelling direct debits, but the sub isn't paid that way" in {
    val apiGatewayOp = filterDirectDebit(onlyCancelDirectDebit = true, nonDirectDebit = true)
    assert(apiGatewayOp.toDisjunction match {
      case -\/(_) => true
      case _ => false
    }, s"We got: $apiGatewayOp")
  }

  "filterDirectDebit" should "return a right if we're not just cancelling direct debits even if it's not paid by DD" in {
    val apiGatewayOp = filterDirectDebit(onlyCancelDirectDebit = false, nonDirectDebit = true)
    assert(apiGatewayOp.toDisjunction match {
      case \/-(_) => true
      case _ => false
    }, s"We got: $apiGatewayOp")
  }

  "filterDirectDebit" should "return a right if we're only cancelling DDs and it is a direct debit" in {
    val apiGatewayOp = filterDirectDebit(onlyCancelDirectDebit = true, nonDirectDebit = false)
    assert(apiGatewayOp.toDisjunction match {
      case \/-(_) => true
      case _ => false
    }, s"We got: $apiGatewayOp")
  }

  "authenticateCallout" should "return a left if the credentials are invalid" in {
    val requestAuth = RequestAuth(apiToken = "incorrectRequestToken")
    val trustedApiConfig = TrustedApiConfig(apiToken = "token", tenantId = "tenant")
    assert(ApiGatewayHandler.isAuthorised(true, Some(requestAuth), trustedApiConfig) == false)
  }

  "authenticateCallout" should "return a right if the credentials are valid" in {
    val requestAuth = RequestAuth(apiToken = "token")
    val trustedApiConfig = TrustedApiConfig(apiToken = "token", tenantId = "tenant")
    assert(ApiGatewayHandler.isAuthorised(true, Some(requestAuth), trustedApiConfig) == true)
  }

}

class DeserialiserTest extends FlatSpec with Matchers {

  "deserialise UrlParams" should "manage without the only direct debit param" in {
    val json = """{"apiToken": "a", "apiClientId": "b"}"""
    val actualRequest = Json.parse(json).validate[AutoCancelUrlParams]

    Json.parse(json).validate[AutoCancelUrlParams] should be(JsSuccess(AutoCancelUrlParams(false)))

  }

  it should "manage with the only direct debit param being false" in {
    val json = """{"apiToken": "a", "apiClientId": "b", "onlyCancelDirectDebit": "false"}"""
    val actualRequest = Json.parse(json).validate[ApiGatewayRequest]

    Json.parse(json).validate[AutoCancelUrlParams] should be(JsSuccess(AutoCancelUrlParams(false)))

  }

  it should "manage with the only direct debit param being true" in {
    val json = """{"apiToken": "a", "apiClientId": "b", "onlyCancelDirectDebit": "true"}"""
    val actualRequest = Json.parse(json).validate[ApiGatewayRequest]

    Json.parse(json).validate[AutoCancelUrlParams] should be(JsSuccess(AutoCancelUrlParams(true)))

  }

}
