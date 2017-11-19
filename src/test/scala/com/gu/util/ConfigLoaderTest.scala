package com.gu.util

import com.gu.TestData
import com.gu.util.ETConfig.{ ETSendId, ETSendIds }
import org.scalatest.{ FlatSpec, Matchers }

import scala.util.Success

class ConfigLoaderTest extends FlatSpec with Matchers {

  "loader" should "be able to load config successfully" in {
    //    val requestAuth = Some(RequestAuth(apiClientId = "validUser", apiToken = "ndjashjkhajshs"))
    //    assert(credentialsAreValid(requestAuth, trustedApiConfig) == false)
    val prod = Config.parseConfig(TestData.codeConfig)
    prod should be(Success(Config(Stage("DEV"), TrustedApiConfig("a", "b", "c"), zuoraRestConfig = ZuoraRestConfig("https://ddd", "e@f.com", "ggg"),
      etConfig = ETConfig(etSendIDs = ETSendIds(ETSendId("111"), ETSendId("222"), ETSendId("333"), ETSendId("444"), ETSendId("ccc")), clientId = "jjj", clientSecret = "kkk"))))
  }

}
