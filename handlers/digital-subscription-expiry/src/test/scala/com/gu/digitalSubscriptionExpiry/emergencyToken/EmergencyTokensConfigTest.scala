package com.gu.digitalSubscriptionExpiry.emergencyToken

import org.scalatest.FlatSpec
import org.scalatest.Matchers._
import play.api.libs.json.{JsResult, JsSuccess, Json}

class EmergencyTokensConfigTest extends FlatSpec {

  "Emergency token" should "deserialise correctly from config file" in {

    val config =
      """
        |{
        |       "prefix" : "somePrefix",
        |	      "secret" : "someSecret"
        | }
      """.stripMargin

    val expected: JsResult[EmergencyTokensConfig] = JsSuccess(
      EmergencyTokensConfig(
        prefix = "somePrefix",
        secret = "someSecret"
      )
    )

    val event: JsResult[EmergencyTokensConfig] = Json.parse(config).validate[EmergencyTokensConfig]

    event shouldBe expected
  }

}
