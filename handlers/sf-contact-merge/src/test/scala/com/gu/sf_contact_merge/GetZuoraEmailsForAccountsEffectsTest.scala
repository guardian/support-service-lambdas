package com.gu.sf_contact_merge

import com.gu.effects.{GetFromS3, RawEffects}
import com.gu.sf_contact_merge.GetZuoraEmailsForAccounts.{AccountId, EmailAddress}
import com.gu.test.EffectsTest
import com.gu.util.config.{LoadConfigModule, Stage}
import com.gu.util.reader.Types.ApiGatewayOp.ContinueProcessing
import com.gu.util.reader.Types._
import com.gu.util.zuora.SafeQueryBuilder.ToNel
import com.gu.util.zuora.{ZuoraQuery, ZuoraRestConfig, ZuoraRestRequestMaker}
import org.scalatest.{FlatSpec, Matchers}

class GetZuoraEmailsForAccountsEffectsTest extends FlatSpec with Matchers {

  it should "return the right emails" taggedAs EffectsTest in {
    val actual = for {
      zuoraRestConfig <- LoadConfigModule(Stage("DEV"), GetFromS3.fetchString)[ZuoraRestConfig].toApiGatewayOp("parse config")
      getZuoraEmailsForAccounts = GetZuoraEmailsForAccounts(ZuoraQuery(ZuoraRestRequestMaker(RawEffects.response, zuoraRestConfig))) _
      testData = ToNel.literal(AccountId("2c92c0f9624bbc5f016253e573970b16"), AccountId("2c92c0f8646e0a6601646ff9b98e7b5f"))
      maybeEmailAddresses <- getZuoraEmailsForAccounts(testData).toApiGatewayOp("get zuora emails for accounts")
    } yield maybeEmailAddresses
    actual should be(ContinueProcessing(List(Some(EmailAddress("peppa.pig@guardian.co.uk")), None)))
  }

}
