package com.gu.sf_contact_merge.update.identityid

import com.gu.DevZuora
import com.gu.effects.{GetFromS3, RawEffects}
import com.gu.salesforce.TypesForSFEffectsData.SFContactId
import com.gu.sf_contact_merge.TypeConvert._
import com.gu.sf_contact_merge.Types.IdentityId
import com.gu.sf_contact_merge.getaccounts.GetZuoraContactDetails.EmailAddress
import com.gu.sf_contact_merge.update.UpdateAccountSFLinks
import com.gu.sf_contact_merge.update.UpdateAccountSFLinks.{CRMAccountId, LinksFromZuora}
import com.gu.sf_contact_merge.update.UpdateSFContacts.IdentityIdToUse
import com.gu.sf_contact_merge.update.identityid.GetZuoraAccount.WireModel.{BasicInfo, ZContact, ZuoraAccount}
import com.gu.test.EffectsTest
import com.gu.util.config.{LoadConfigModule, Stage}
import com.gu.util.reader.Types._
import com.gu.util.zuora.{ZuoraRestConfig, ZuoraRestRequestMaker}
import org.scalatest.{FlatSpec, Matchers}
import scalaz.\/-

import scala.util.Random

// run this manually
class UpdateAccountSFLinksEffectsTest extends FlatSpec with Matchers {

  it should "successfully UPDATE the identity id against dev" taggedAs EffectsTest in {

    val unique = s"${Random.nextInt(10000)}"

    val actual = for {
      zuoraRestConfig <- LoadConfigModule(Stage("DEV"), GetFromS3.fetchString)[ZuoraRestConfig].toApiGatewayOp("load config")
      zuoraDeps = ZuoraRestRequestMaker(RawEffects.response, zuoraRestConfig)
      update = UpdateAccountSFLinks(zuoraDeps.put)
      updateAccount = update(LinksFromZuora(
        SFContactId(s"cont$unique"),
        CRMAccountId(s"acc$unique"),
        Some(IdentityIdToUse(IdentityId(s"ident$unique"))),
        Some(EmailAddress(s"fulfilment.dev+$unique@guardian.co.uk"))
      ))
      _ <- updateAccount(DevZuora.accountWithRandomLinks).toApiGatewayOp("AddIdentityIdToAccount")
      basicInfo <- GetZuoraAccount(zuoraDeps)(DevZuora.accountWithRandomLinks).toApiGatewayOp("GetIdentityIdForAccount")
    } yield basicInfo
    actual.toDisjunction should be(\/-(ZuoraAccount(
      BasicInfo(s"cont$unique", s"acc$unique", Some(s"ident$unique")),
      ZContact(s"fulfilment.dev+$unique@guardian.co.uk")
    )))

  }

}

