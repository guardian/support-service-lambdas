package com.gu.autoCancel

import com.gu.util.apigateway.ApiGatewayResponse._
import com.gu.util.apigateway.{ApiGatewayHandler, ApiGatewayRequest, RequestAuth, StripeAccount}
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

  import AutoCancelInputFilter._
  import AutoCancelHandlerTest._

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
    assert(ApiGatewayHandler.authenticateCallout(true, Some(requestAuth), trustedApiConfig).toDisjunction == -\/(unauthorized))
  }

  "authenticateCallout" should "return a right if the credentials are valid" in {
    val requestAuth = RequestAuth(apiToken = "token")
    val trustedApiConfig = TrustedApiConfig(apiToken = "token", tenantId = "tenant")
    assert(ApiGatewayHandler.authenticateCallout(true, Some(requestAuth), trustedApiConfig).toDisjunction == \/-(()))
  }

}

class DeserialiserTest extends FlatSpec with Matchers {

  "deserialise APIGatewayRequest" should "manage without the only direct debit param" in {
    val json = """{"queryStringParameters": {"apiToken": "a", "apiClientId": "b"}, "body": "haha"}"""
    val actualRequest = Json.parse(json).validate[ApiGatewayRequest]

    actualRequest.map(_.queryStringParameters.map(_.onlyCancelDirectDebit)) should be(JsSuccess(Some(false)))

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

  "deserialise APIGatewayRequest" should "manage without the stripe param" in {
    val json = """{"queryStringParameters": {"apiToken": "a", "apiClientId": "b"}, "body": "haha"}"""
    val actualRequest = Json.parse(json).validate[ApiGatewayRequest]

    actualRequest.map(_.queryStringParameters.flatMap(_.stripeAccount)) should be(JsSuccess(None))

  }

  "deserialise APIGatewayRequest" should "manage without a valid stripe param" in {
    val json = """{"queryStringParameters": {"apiToken": "a", "apiClientId": "b", "stripeAccount": "HAHAHAHAHAHA"}, "body": "haha"}"""
    val actualRequest = Json.parse(json).validate[ApiGatewayRequest]

    actualRequest.map(_.queryStringParameters.flatMap(_.stripeAccount)) should be(JsSuccess(None))

  }

  it should "manage with the only stripe param set" in {
    val json = """{"queryStringParameters": {"apiToken": "a", "apiClientId": "b", "stripeAccount": "GNM_Membership_AUS"}, "body": "haha"}"""
    val actualRequest = Json.parse(json).validate[ApiGatewayRequest]

    actualRequest.map(_.queryStringParameters.flatMap(_.stripeAccount)) should be(JsSuccess(Some(StripeAccount.GNM_Membership_AUS)))

  }

}
