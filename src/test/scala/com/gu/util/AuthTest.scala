package com.gu.util

import com.gu.autoCancel.AutoCancelHandler.RequestAuth
import com.gu.util.Auth._
import org.scalatest.FlatSpec
import play.api.libs.json.{ JsValue, Json }

class AuthTest extends FlatSpec {

  val trustedApiConfig = TrustedApiConfig("validUser", "correctPassword", "tenant123")

  def generateInputEvent(apiClientId: String, apiToken: String): JsValue = {

    def constructQueryStrings(apiClientId: String, apiToken: String) = Json.obj(
      "apiClientId" -> apiClientId,
      "apiToken" -> apiToken
    )
    val headers = Json.obj(
      "Content-Type" -> "text/xml"
    )
    val sampleJson = Json.obj(
      "resource" -> "test-resource",
      "path" -> "/test-path",
      "httpMethod" -> "POST",
      "headers" -> headers,
      "queryStringParameters" -> constructQueryStrings(apiClientId, apiToken)
    )
    sampleJson
  }

  "deprecatedCredentialsAreValid" should "return false if the username query string is missing" in {
    val sampleJson = Json.obj(
      "resource" -> "test-resource",
      "path" -> "/test-path",
      "httpMethod" -> "POST"
    )
    assert(deprecatedCredentialsAreValid(sampleJson, trustedApiConfig) == false)
  }

  "deprecatedCredentialsAreValid" should "return false for an incorrect password" in {
    val inputEvent = generateInputEvent("validUser", "incorrectPassword")
    assert(deprecatedCredentialsAreValid(inputEvent, trustedApiConfig) == false)
  }

  "deprecatedCredentialsAreValid" should "return false for an incorrect username" in {
    val inputEvent = generateInputEvent("invalidUser", "correctPassword")
    assert(deprecatedCredentialsAreValid(inputEvent, trustedApiConfig) == false)
  }

  "deprecatedCredentialsAreValid" should "return true for correct credentials" in {
    val inputEvent = generateInputEvent("validUser", "correctPassword")
    assert(deprecatedCredentialsAreValid(inputEvent, trustedApiConfig) == true)
  }

  "credentialsAreValid" should "return true for correct credentials" in {
    val requestAuth = RequestAuth(apiClientId = "validUser", apiToken = "correctPassword")
    assert(credentialsAreValid(requestAuth, trustedApiConfig) == true)
  }

  "credentialsAreValid" should "return false for an incorrect user" in {
    val requestAuth = RequestAuth(apiClientId = "invalidUser", apiToken = "correctPassword")
    assert(credentialsAreValid(requestAuth, trustedApiConfig) == false)
  }

  "credentialsAreValid" should "return false for an incorrect password" in {
    val requestAuth = RequestAuth(apiClientId = "validUser", apiToken = "ndjashjkhajshs")
    assert(credentialsAreValid(requestAuth, trustedApiConfig) == false)
  }

}
