package com.gu.sf_contact_merge

import com.gu.effects.{RawEffects, S3ConfigLoad}
import com.gu.sf_contact_merge.GetZuoraEmailsForAccounts.{AccountId, EmailAddress}
import com.gu.sf_contact_merge.Handler.StepsConfig
import com.gu.test.EffectsTest
import com.gu.util.config.{LoadConfig, Stage}
import com.gu.util.reader.Types.ApiGatewayOp.ContinueProcessing
import com.gu.util.zuora.{ZuoraQuery, ZuoraRestRequestMaker}
import org.scalatest.{FlatSpec, Matchers}
import com.gu.util.reader.Types._

class GetZuoraEmailsForAccountsEffectsTest extends FlatSpec with Matchers {

  it should "return the right emails" taggedAs EffectsTest in {
    val actual = for {
      configAttempt <- S3ConfigLoad.load(Stage("DEV")).toApiGatewayOp("load config")
      config <- LoadConfig.parseConfig[StepsConfig](configAttempt).toApiGatewayOp("parse config")
      zuoraRestConfig = config.stepsConfig.zuoraRestConfig
      getZuoraEmailsForAccounts = GetZuoraEmailsForAccounts(ZuoraQuery(ZuoraRestRequestMaker(RawEffects.response, zuoraRestConfig))) _
      testData = List("2c92c0f9624bbc5f016253e573970b16", "2c92c0f8646e0a6601646ff9b98e7b5f").map(AccountId.apply)
      aaa <- getZuoraEmailsForAccounts(testData).toApiGatewayOp("get zuora emails for accounts")
    } yield aaa
    actual should be(ContinueProcessing(List(Some(EmailAddress("peppa.pig@guardian.co.uk")), None)))
  }

}
