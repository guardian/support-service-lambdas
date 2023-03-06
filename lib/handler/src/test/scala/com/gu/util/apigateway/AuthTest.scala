package com.gu.util.apigateway

import com.gu.util.apigateway.Auth._
import play.api.libs.json.{JsValue, Json}
import org.scalatest.flatspec.AnyFlatSpec

class AuthTest extends AnyFlatSpec {

  val trustedApiConfig = TrustedApiConfig("correctPassword", "tenant123")

  def generateInputEvent(apiClientId: String, apiToken: String): JsValue = {

    def constructQueryStrings(apiClientId: String, apiToken: String) = Json.obj(
      "apiClientId" -> apiClientId,
      "apiToken" -> apiToken,
    )
    val headers = Json.obj(
      "Content-Type" -> "text/xml",
    )
    val sampleJson = Json.obj(
      "resource" -> "test-resource",
      "path" -> "/test-path",
      "httpMethod" -> "POST",
      "headers" -> headers,
      "queryStringParameters" -> constructQueryStrings(apiClientId, apiToken),
    )
    sampleJson
  }

  "credentialsAreValid" should "return false if the username query string is missing" in {
    assert(credentialsAreValid(trustedApiConfig, RequestAuth(None)) == false)
  }
  "credentialsAreValid" should "return true for correct credentials" in {
    val requestAuth = RequestAuth(apiToken = Some("correctPassword"))
    assert(credentialsAreValid(trustedApiConfig, requestAuth) == true)
  }

  "credentialsAreValid" should "return false for an incorrect password" in {
    val requestAuth = RequestAuth(apiToken = Some("incorrectPassword"))
    assert(credentialsAreValid(trustedApiConfig, requestAuth) == false)
  }

}
