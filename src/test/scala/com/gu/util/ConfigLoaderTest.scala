package com.gu.util

import com.gu.util.ETConfig.ETSendKeysForAttempt
import org.scalatest.{ FlatSpec, Matchers }

import scala.util.Success

class ConfigLoaderTest extends FlatSpec with Matchers {

  val codeConfig =
    """
      |{
      |  "trustedApiConfig": {
      |    "apiClientId": "a",
      |    "apiToken": "b",
      |    "tenantId": "c"
      |  },
      |  "zuoraRestConfig": {
      |    "baseUrl": "https://ddd",
      |    "username": "e@f.com",
      |    "password": "ggg"
      |  },
      |  "etConfig": {
      |    "stageETIDForAttempt":
      |    {"0": "h"},
      |    "clientId": "jjj",
      |    "clientSecret": "kkk"
      |  }
      |}
    """.stripMargin

  "loader" should "be able to load the prod config successfully" in {
    //    val requestAuth = Some(RequestAuth(apiClientId = "validUser", apiToken = "ndjashjkhajshs"))
    //    assert(credentialsAreValid(requestAuth, trustedApiConfig) == false)
    val prod = Config.parseConfig(codeConfig)
    prod should be(Success(Config(TrustedApiConfig("a", "b", "c"), zuoraRestConfig = ZuoraRestConfig("https://ddd", "e@f.com", "ggg"),
      etConfig = ETConfig(ETSendKeysForAttempt(Map(0 -> "h")), clientId = "jjj", clientSecret = "kkk"))))
  }

}
