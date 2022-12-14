package com.gu.digitalSubscriptionExpiry.emergencyToken

import org.scalatest.matchers.should.Matchers._
import play.api.libs.json.{JsResult, JsSuccess, Json}
import org.scalatest.matchers
import org.scalatest.flatspec.AnyFlatSpec

class EmergencyTokensConfigTest extends AnyFlatSpec {

  "Emergency token" should "deserialise correctly from config file" in {

    val config =
      """
        |{
        |  "prefix" : "somePrefix",
        |	 "secret" : "someSecret"
        | }
      """.stripMargin

    val expected: JsResult[EmergencyTokensConfig] = JsSuccess(
      EmergencyTokensConfig(
        prefix = "somePrefix",
        secret = "someSecret",
      ),
    )

    val actual: JsResult[EmergencyTokensConfig] = Json.parse(config).validate[EmergencyTokensConfig]

    actual shouldBe expected
  }

}
