package com.gu.autocancel

import com.gu.autoCancel.Auth._
import org.scalatest.FlatSpec
import play.api.libs.json.{ JsValue, Json }

class AuthTest extends FlatSpec {

  def generateInputEvent(apiuser: String, apipass: String): JsValue = {

    def constructQueryStrings(user: String, pass: String) = Json.obj(
      "apiuser" -> user,
      "apipass" -> pass
    )
    val headers = Json.obj(
      "Content-Type" -> "text/xml"
    )
    val sampleJson = Json.obj(
      "resource" -> "test-resource",
      "path" -> "/test-path",
      "httpMethod" -> "POST",
      "headers" -> headers,
      "queryStringParameters" -> constructQueryStrings(apiuser, apipass)
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
