package com.gu.autoCancel

import com.gu.autoCancel.Auth._
import org.scalatest.FlatSpec
import play.api.libs.json.{ JsValue, Json }

class AuthTest extends FlatSpec {

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

  "credentialsAreValid" should "return false if the username query string is missing" in {
    val sampleJson = Json.obj(
      "resource" -> "test-resource",
      "path" -> "/test-path",
      "httpMethod" -> "POST"
    )
    assert(credentialsAreValid(sampleJson, "validUser", "correctPassword") == false)
  }

  "credentialsAreValid" should "return false for an incorrect password" in {
    val inputEvent = generateInputEvent("validUser", "incorrectPassword")
    assert(credentialsAreValid(inputEvent, "validUser", "correctPassword") == false)
  }

  "credentialsAreValid" should "return false for an incorrect username" in {
    val inputEvent = generateInputEvent("invalidUser", "correctPassword")
    assert(credentialsAreValid(inputEvent, "validUser", "correctPassword") == false)
  }

  "credentialsAreValid" should "return true for correct credentials" in {
    val inputEvent = generateInputEvent("validUser", "correctPassword")
    assert(credentialsAreValid(inputEvent, "validUser", "correctPassword") == true)
  }

}
