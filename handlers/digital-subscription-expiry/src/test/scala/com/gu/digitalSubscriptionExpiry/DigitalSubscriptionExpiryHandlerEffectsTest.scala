package com.gu.digitalSubscriptionExpiry

import java.io.{ByteArrayInputStream, ByteArrayOutputStream}

import com.gu.effects.RawEffects

import com.gu.test.EffectsTest
import com.gu.util.apigateway.ApiGatewayHandler.LambdaIO
import org.scalatest.{Assertion, FlatSpec, Matchers}
import play.api.libs.json.Json

class DigitalSubscriptionExpiryHandlerEffectsTest extends FlatSpec with Matchers {

  val rawEffects = RawEffects.createDefault

  it should "return 404 for invalid subscriber id" taggedAs EffectsTest in {

    val invalidRequest: String =
      """
        |{
        |    "body": "{\"subscriberId\" : \"invalidSubId\",\"password\" : \"invalidPassword\"}"
        |}
      """.stripMargin

    val stream = new ByteArrayInputStream(invalidRequest.getBytes(java.nio.charset.StandardCharsets.UTF_8))
    val os = new ByteArrayOutputStream()

    //execute

    Handler.runWithEffects(rawEffects, LambdaIO(stream, os, null))

    val responseString = new String(os.toByteArray, "UTF-8")

    responseString jsonMatches notFoundResponse
  }

  it should "return bad request for invalid json" taggedAs EffectsTest in {

    val invalidRequest: String =
      """
        |{
        |    "body": "this is not json"
        |}
      """.stripMargin

    val stream = new ByteArrayInputStream(invalidRequest.getBytes(java.nio.charset.StandardCharsets.UTF_8))
    val os = new ByteArrayOutputStream()

    //execute

    Handler.runWithEffects(rawEffects, LambdaIO(stream, os, null))

    val responseString = new String(os.toByteArray, "UTF-8")

    responseString jsonMatches badRequest
  }

  it should "successful get expiry date for sub against real backend" taggedAs EffectsTest in {
    val request: String =
      """
          |{
          |    "body": "{\"subscriberId\" : \"A-S00044160\",\"password\" : \"W134GH\"}"
          |}
        """.stripMargin

    val stream = new ByteArrayInputStream(request.getBytes(java.nio.charset.StandardCharsets.UTF_8))
    val os = new ByteArrayOutputStream()
    val rawEffects = RawEffects.createDefault

    //execute
    Handler.runWithEffects(rawEffects, LambdaIO(stream, os, null))

    val responseString = new String(os.toByteArray, "UTF-8")

    val expectedResponse =
      """
             |{"statusCode":"200","headers":{"Content-Type":"application/json"},"body":"{\n  \"expiry\" : {\n    \"expiryDate\" : \"2018-11-29\",\n    \"expiryType\" : \"sub\",\n    \"content\" : \"SevenDay\"\n  }\n}"}
             |""".stripMargin
    responseString jsonMatches expectedResponse
  }

  it should "successful get expiry date for paper + sub against real backend" taggedAs EffectsTest in {
    val request: String =
      """
        |{
        |    "body": "{\"subscriberId\" : \"A-S00073288\",\"password\" : \"W1234\"}"
        |}
      """.stripMargin

    val stream = new ByteArrayInputStream(request.getBytes(java.nio.charset.StandardCharsets.UTF_8))
    val os = new ByteArrayOutputStream()
    val rawEffects = RawEffects.createDefault

    //execute
    Handler.runWithEffects(rawEffects, LambdaIO(stream, os, null))

    val responseString = new String(os.toByteArray, "UTF-8")

    val expectedResponse =
      """
        |{"statusCode":"200","headers":{"Content-Type":"application/json"},"body":"{\n  \"expiry\" : {\n    \"expiryDate\" : \"2019-04-13\",\n    \"expiryType\" : \"sub\",\n    \"content\" : \"SevenDay\"\n  }\n}"}
        |""".stripMargin
    responseString jsonMatches expectedResponse
  }
  implicit class JsonMatcher(private val actual: String) {
    def jsonMatches(expected: String): Assertion = {
      val expectedJson = Json.parse(expected)
      val actualJson = Json.parse(actual)
      actualJson should be(expectedJson)
    }
  }

  val notFoundResponse =
    """
      |{
      |"statusCode":"404",
      |"headers":{"Content-Type":"application/json"},
      |"body":"{\n  \"error\" : {\n    \"message\" : \"Unknown subscriber\",\n    \"code\" : -90\n  }\n}"
      |}
      |""".stripMargin

  val badRequest =
    """
      |{
      |"statusCode":"400",
      |"headers":{"Content-Type":"application/json"},
      |"body":"{\n  \"error\" : {\n    \"message\" : \"Mandatory data missing from request\",\n    \"code\" : -50\n  }\n}"
      |}
      |""".stripMargin

}
