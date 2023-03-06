package com.gu.sf_contact_merge.update.identityid

import com.gu.DevZuora
import com.gu.effects.{GetFromS3, RawEffects}
import com.gu.salesforce.TypesForSFEffectsData.SFContactId
import com.gu.sf_contact_merge.TypeConvert._
import com.gu.sf_contact_merge.Types.{IdentityId, WinningSFContact}
import com.gu.sf_contact_merge.getaccounts.GetContacts.AccountId
import com.gu.sf_contact_merge.getaccounts.GetZuoraContactDetails.EmailAddress
import com.gu.sf_contact_merge.update.UpdateAccountSFLinks
import com.gu.sf_contact_merge.update.UpdateAccountSFLinks.{CRMAccountId, ReplaceZuoraIdentityId, ZuoraFieldUpdates}
import com.gu.sf_contact_merge.update.identityid.GetZuoraAccount.WireModel.{BasicInfo, ZContact, ZuoraAccount}
import com.gu.test.EffectsTest
import com.gu.util.config.{LoadConfigModule, Stage}
import com.gu.util.reader.Types._
import com.gu.util.zuora.{ZuoraRestConfig, ZuoraRestRequestMaker}

import scala.util.Random
import org.scalatest.flatspec.AnyFlatSpec
import org.scalatest.matchers.should.Matchers

// run this manually
class UpdateAccountSFLinksEffectsTest extends AnyFlatSpec with Matchers {

  it should "successfully UPDATE the identity id against dev" taggedAs EffectsTest in {

    val unique = s"${Random.nextInt(10000)}"

    val actual = for {
      zuoraRestConfig <- LoadConfigModule(Stage("DEV"), GetFromS3.fetchString)[ZuoraRestConfig]
        .toApiGatewayOp("load config")
      zuoraDeps = ZuoraRestRequestMaker(RawEffects.response, zuoraRestConfig)
      update = UpdateAccountSFLinks(zuoraDeps.put)
      updateAccount = update(
        ZuoraFieldUpdates(
          WinningSFContact(SFContactId(s"cont$unique")),
          CRMAccountId(s"acc$unique"),
          ReplaceZuoraIdentityId(IdentityId(s"ident$unique")),
          Some(EmailAddress(s"fulfilment.dev+$unique@guardian.co.uk")),
        ),
        _: AccountId,
      )
      _ <- updateAccount(DevZuora.accountWithRandomLinks).toApiGatewayOp("AddIdentityIdToAccount")
      basicInfo <- GetZuoraAccount(zuoraDeps)(DevZuora.accountWithRandomLinks).toApiGatewayOp("GetIdentityIdForAccount")
    } yield basicInfo
    actual.toDisjunction should be(
      Right(
        ZuoraAccount(
          BasicInfo(s"cont$unique", s"acc$unique", Some(s"ident$unique")),
          ZContact(s"fulfilment.dev+$unique@guardian.co.uk"),
        ),
      ),
    )

  }

}
