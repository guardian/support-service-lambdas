package com.gu.digitalSubscriptionExpiry

import java.io.{ByteArrayInputStream, ByteArrayOutputStream}
import java.time.LocalDateTime

import com.gu.digitalSubscriptionExpiry.Runner._
import com.gu.effects.{GetFromS3, RawEffects}
import com.gu.test.EffectsTest
import com.gu.util.apigateway.ApiGatewayHandler.LambdaIO
import org.scalatest.Assertion
import play.api.libs.json.Json
import org.scalatest.flatspec.AnyFlatSpec
import org.scalatest.matchers.should.Matchers

class DigitalSubscriptionExpiryHandlerEffectsTest extends AnyFlatSpec with Matchers {

  it should "return 404 for invalid subscriber id" taggedAs EffectsTest in {

    val request: String =
      """
        |{
        |    "body": "{\"subscriberId\" : \"invalidSubId\",\"password\" : \"invalidPassword\"}"
        |}
      """.stripMargin

    val responseString: String = Runner(request)

    responseString jsonMatches notFoundResponse
  }

  it should "successful get expiry date for sub against real backend" taggedAs EffectsTest in {
    val request: String =
      """
        |{
        |    "body": "{\"subscriberId\" : \"A-S00044160\",\"password\" : \"W134GH\"}"
        |}
      """.stripMargin

    val responseString: String = Runner(request)

    val expectedResponse =
      """
        |{"statusCode":"200","headers":{"Content-Type":"application/json"},"body":"{\n  \"expiry\" : {\n    \"expiryDate\" : \"2019-11-30\",\n    \"expiryType\" : \"sub\",\n    \"content\" : \"SevenDay\"\n  }\n}"}
        |""".stripMargin
    responseString jsonMatches expectedResponse
  }

  it should "successful get expiry date for paper + sub against real backend" taggedAs EffectsTest in {
    val request: String =
      """
        |{
        |    "body": "{\"subscriberId\" : \"A-S00050908\",\"password\" : \"testerson\"}"
        |}
      """.stripMargin

    val responseString: String = Runner(request)

    val expectedResponse =
      """
        |{"statusCode":"200","headers":{"Content-Type":"application/json"},"body":"{\n  \"expiry\" : {\n    \"expiryDate\" : \"2019-04-17\",\n    \"expiryType\" : \"sub\",\n    \"content\" : \"SevenDay\"\n  }\n}"}
        |""".stripMargin
    responseString jsonMatches expectedResponse
  }

}
object Runner {

  val now: () => LocalDateTime = () => LocalDateTime.of(2018, 4, 20, 2, 12)

  def apply(request: String) = {
    val stream = new ByteArrayInputStream(request.getBytes(java.nio.charset.StandardCharsets.UTF_8))
    val os = new ByteArrayOutputStream()

    // execute
    Handler.runForLegacyTestsSeeTestingMd(
      RawEffects.stage,
      GetFromS3.fetchString,
      RawEffects.response,
      now,
      LambdaIO(stream, os, null),
    )

    val responseString = new String(os.toByteArray, "UTF-8")
    responseString
  }

  implicit class JsonMatcher(private val actual: String) extends Matchers {
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

}
