package com.gu.zuora.baton

import com.gu.util.zuora.ZuoraOAuthConfig
import org.scalatest.flatspec.AnyFlatSpec
import org.scalatest.matchers.should.Matchers
import play.api.libs.json.Json

class BatonZuoraRestConfigTest extends AnyFlatSpec with Matchers {
  "BatonZuoraRestConfig" should "read the Baton OAuth credentials from the existing config" in {
    val config = Json
      .parse(
        """{
          |  "baseUrl": "https://rest.apisandbox.zuora.com/v1",
          |  "batonZuora": {
          |    "user": {
          |      "loginName": "legacy-user",
          |      "password": "legacy-password"
          |    },
          |    "oauth": {
          |      "clientId": "test-client",
          |      "clientSecret": "test-secret"
          |    }
          |  }
          |}""".stripMargin,
      )
      .as[BatonZuoraRestConfig]

    config shouldBe BatonZuoraRestConfig(
      "https://rest.apisandbox.zuora.com/v1",
      BatonZuoraConfig(ZuoraOAuthConfig("test-client", "test-secret")),
    )
  }
}
