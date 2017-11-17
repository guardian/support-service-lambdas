package com.gu.util

import com.gu.util.ETConfig.{ ETSendId, ETSendIds }
import org.scalatest.{ FlatSpec, Matchers }

import scala.util.Success

class ConfigLoaderTest extends FlatSpec with Matchers {

  val codeConfig =
    """
      |{ "stage": "DEV",
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
      |    "etSendIDs":
      |    {
      |      "pf1": "111",
      |      "pf2": "222",
      |      "pf3": "333",
      |      "pf4": "444",
      |      "cancelled": "ccc"
      |    },
      |    "clientId": "jjj",
      |    "clientSecret": "kkk"
      |  }
      |}
    """.stripMargin

  "loader" should "be able to load config successfully" in {
    //    val requestAuth = Some(RequestAuth(apiClientId = "validUser", apiToken = "ndjashjkhajshs"))
    //    assert(credentialsAreValid(requestAuth, trustedApiConfig) == false)
    val prod = Config.parseConfig(codeConfig)
    prod should be(Success(Config("DEV", TrustedApiConfig("a", "b", "c"), zuoraRestConfig = ZuoraRestConfig("https://ddd", "e@f.com", "ggg"),
      etConfig = ETConfig(etSendIDs = ETSendIds(ETSendId("111"), ETSendId("222"), ETSendId("333"), ETSendId("444"), ETSendId("ccc")), clientId = "jjj", clientSecret = "kkk"))))
  }

}
