package com.gu.util

import com.gu.util.Auth._
import com.gu.util.apigateway.{ ApiGatewayRequest, RequestAuth }
import org.scalatest.FlatSpec
import play.api.libs.json.{ JsError, JsSuccess, JsValue, Json }

class AuthTest extends FlatSpec {

  val trustedApiConfig = TrustedApiConfig("correctPassword", "tenant123")

  def generateInputEvent(apiClientId: String, apiToken: String): JsValue = {

    def constructQueryStrings(apiClientId: String, apiToken: String) = Json.obj(
      "apiClientId" -> apiClientId,
      "apiToken" -> apiToken)
    val headers = Json.obj(
      "Content-Type" -> "text/xml")
    val sampleJson = Json.obj(
      "resource" -> "test-resource",
      "path" -> "/test-path",
      "httpMethod" -> "POST",
      "headers" -> headers,
      "queryStringParameters" -> constructQueryStrings(apiClientId, apiToken))
    sampleJson
  }

  "deprecatedCredentialsAreValid" should "return false if the username query string is missing" in {
    val sampleJson = Json.obj(
      "resource" -> "test-resource",
      "path" -> "/test-path",
      "httpMethod" -> "POST",
      "body" -> "")
    sampleJson.validate[ApiGatewayRequest] match {
      case JsError(e) => fail(s"couldn't parse with $e")
      case JsSuccess(req, _) =>
        assert(credentialsAreValid(req.requestAuth, trustedApiConfig) == false)
    }
  }

  "credentialsAreValid" should "return true for correct credentials" in {
    val requestAuth = Some(RequestAuth(apiToken = "correctPassword"))
    assert(credentialsAreValid(requestAuth, trustedApiConfig) == true)
  }

  "credentialsAreValid" should "return false for an incorrect password" in {
    val requestAuth = Some(RequestAuth(apiToken = "ndjashjkhajshs"))
    assert(credentialsAreValid(requestAuth, trustedApiConfig) == false)
  }

}
