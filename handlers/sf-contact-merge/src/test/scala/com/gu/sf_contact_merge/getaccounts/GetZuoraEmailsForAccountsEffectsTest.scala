package com.gu.sf_contact_merge.getaccounts

import com.gu.CodeZuora
import com.gu.effects.{GetFromS3, RawEffects}
import com.gu.salesforce.TypesForSFEffectsData.SFContactId
import com.gu.sf_contact_merge.TypeConvert._
import com.gu.sf_contact_merge.Types.IdentityId
import com.gu.sf_contact_merge.getaccounts.GetIdentityAndZuoraEmailsForAccountsSteps.IdentityAndSFContactAndEmail
import com.gu.sf_contact_merge.getaccounts.GetZuoraContactDetails.{EmailAddress, FirstName, LastName}
import com.gu.test.EffectsTest
import com.gu.util.config.{LoadConfigModule, Stage}
import com.gu.util.reader.Types.ApiGatewayOp.ContinueProcessing
import com.gu.util.reader.Types._
import com.gu.util.zuora.{ZuoraQuery, ZuoraRestConfig, ZuoraRestRequestMaker}
import cats.data.NonEmptyList
import org.scalatest.flatspec.AnyFlatSpec
import org.scalatest.matchers.should.Matchers

class GetZuoraEmailsForAccountsEffectsTest extends AnyFlatSpec with Matchers {

  it should "return the right emails" taggedAs EffectsTest in {

    val testData = NonEmptyList(CodeZuora.account1, List(CodeZuora.account2))

    val actual = for {
      zuoraRestConfig <- LoadConfigModule(Stage("CODE"), GetFromS3.fetchString).load[ZuoraRestConfig]
        .toApiGatewayOp("parse config")
      zuoraQuerier = ZuoraQuery(ZuoraRestRequestMaker(RawEffects.response, zuoraRestConfig))
      getZuoraEmailsForAccounts = GetIdentityAndZuoraEmailsForAccountsSteps(zuoraQuerier)
      maybeEmailAddresses <- getZuoraEmailsForAccounts(testData).toApiGatewayOp("get zuora emails for accounts")
    } yield maybeEmailAddresses

    actual should be(
      ContinueProcessing(
        List(
          IdentityAndSFContactAndEmail(
            Some(IdentityId("1234567890")),
            SFContactId("contactIdForEffectsTests"),
            Some(EmailAddress("peppa.pig@guardian.co.uk")),
            Some(FirstName("Peppa")),
            LastName("Pig"),
          ),
          IdentityAndSFContactAndEmail(
            None,
            SFContactId("contactIdForEffectsTests3"),
            None,
            Some(FirstName("Suzie")),
            LastName("Sheep"),
          ),
        ),
      ),
    )
  }

}
