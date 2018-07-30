package com.gu.sf_contact_merge

import com.gu.effects.{GetFromS3, RawEffects}
import com.gu.sf_contact_merge.GetContacts.{Account, AccountId, IdentityId, SFContactId}
import com.gu.sf_contact_merge.GetEmails.EmailAddress
import com.gu.sf_contact_merge.GetIdentityAndZuoraEmailsForAccounts._
import com.gu.sf_contact_merge.TypeConvert._
import com.gu.test.EffectsTest
import com.gu.util.config.{LoadConfigModule, Stage}
import com.gu.util.reader.Types.ApiGatewayOp.ContinueProcessing
import com.gu.util.reader.Types._
import com.gu.util.zuora.{ZuoraQuery, ZuoraRestConfig, ZuoraRestRequestMaker}
import org.scalatest.{FlatSpec, Matchers}
import scalaz.NonEmptyList

class GetZuoraEmailsForAccountsEffectsTest extends FlatSpec with Matchers {

  it should "return the right emails" taggedAs EffectsTest in {

    val testData = NonEmptyList("2c92c0f8646e0a6601646ff9b98e7b5f", "2c92c0f964db696f0164dc671eb0245f").map(AccountId.apply)

    val actual = for {
      zuoraRestConfig <- LoadConfigModule(Stage("DEV"), GetFromS3.fetchString)[ZuoraRestConfig].toApiGatewayOp("parse config")
      zuoraQuerier = ZuoraQuery(ZuoraRestRequestMaker(RawEffects.response, zuoraRestConfig))
      getZuoraEmailsForAccounts = GetIdentityAndZuoraEmailsForAccounts(zuoraQuerier) _
      maybeEmailAddresses <- getZuoraEmailsForAccounts(testData).toApiGatewayOp("get zuora emails for accounts")
    } yield maybeEmailAddresses

    actual should be(ContinueProcessing(List(
      AccountAndEmail(
        Account(Some(IdentityId("1234567890")), SFContactId("contactIdForEffectsTests")),
        Some(EmailAddress("peppa.pig@guardian.co.uk"))
      ),
      AccountAndEmail(
        Account(None, SFContactId("contactIdForEffectsTests3")),
        None
      )
    )))
  }

}
