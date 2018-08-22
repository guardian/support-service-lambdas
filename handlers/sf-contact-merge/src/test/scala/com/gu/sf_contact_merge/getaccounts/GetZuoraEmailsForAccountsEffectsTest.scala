package com.gu.sf_contact_merge.getaccounts

import com.gu.DevZuora
import com.gu.effects.{GetFromS3, RawEffects}
import com.gu.sf_contact_merge.update.UpdateSalesforceIdentityId.IdentityId
import com.gu.salesforce.TypesForSFEffectsData.SFContactId
import com.gu.sf_contact_merge.TypeConvert._
import com.gu.sf_contact_merge.getaccounts.GetContacts.AccountId
import com.gu.sf_contact_merge.getaccounts.GetEmails.{EmailAddress, FirstName, LastName}
import com.gu.sf_contact_merge.getaccounts.GetIdentityAndZuoraEmailsForAccountsSteps.IdentityAndSFContactAndEmail
import com.gu.test.EffectsTest
import com.gu.util.config.{LoadConfigModule, Stage}
import com.gu.util.reader.Types.ApiGatewayOp.ContinueProcessing
import com.gu.util.reader.Types._
import com.gu.util.zuora.{ZuoraQuery, ZuoraRestConfig, ZuoraRestRequestMaker}
import org.scalatest.{FlatSpec, Matchers}
import scalaz.NonEmptyList

class GetZuoraEmailsForAccountsEffectsTest extends FlatSpec with Matchers {

  it should "return the right emails" taggedAs EffectsTest in {

    val testData = NonEmptyList(DevZuora.account1, DevZuora.account2)

    val actual = for {
      zuoraRestConfig <- LoadConfigModule(Stage("DEV"), GetFromS3.fetchString)[ZuoraRestConfig].toApiGatewayOp("parse config")
      zuoraQuerier = ZuoraQuery(ZuoraRestRequestMaker(RawEffects.response, zuoraRestConfig))
      getZuoraEmailsForAccounts = GetIdentityAndZuoraEmailsForAccountsSteps(zuoraQuerier, _: NonEmptyList[AccountId])
      maybeEmailAddresses <- getZuoraEmailsForAccounts(testData).toApiGatewayOp("get zuora emails for accounts")
    } yield maybeEmailAddresses

    actual should be(ContinueProcessing(List(
      IdentityAndSFContactAndEmail(
        Some(IdentityId("1234567890")),
        SFContactId("contactIdForEffectsTests"),
        Some(EmailAddress("peppa.pig@guardian.co.uk")),
        Some(FirstName("Peppa")),
        LastName("Pig")
      ),
      IdentityAndSFContactAndEmail(
        None,
        SFContactId("contactIdForEffectsTests3"),
        None,
        Some(FirstName("Suzie")),
        LastName("Sheep")
      )
    )))
  }

}
