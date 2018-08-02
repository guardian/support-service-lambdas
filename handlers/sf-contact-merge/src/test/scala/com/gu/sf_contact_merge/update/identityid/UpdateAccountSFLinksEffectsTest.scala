package com.gu.sf_contact_merge.update.identityid

import com.gu.effects.{GetFromS3, RawEffects}
import com.gu.sf_contact_merge.TypeConvert._
import com.gu.sf_contact_merge.update.UpdateAccountSFLinks
import com.gu.sf_contact_merge.update.UpdateAccountSFLinks.{CRMAccountId, SFPointer}
import com.gu.sf_contact_merge.update.identityid.GetIdentityIdForAccount.WireModel.BasicInfo
import com.gu.sf_contact_merge.validate.GetContacts.{AccountId, IdentityId, SFContactId}
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
    val testAccount = AccountId("2c92c0f9624bbc5f016253e573970b16")

    val actual = for {
      zuoraRestConfig <- LoadConfigModule(Stage("DEV"), GetFromS3.fetchString)[ZuoraRestConfig].toApiGatewayOp("load config")
      zuoraDeps = ZuoraRestRequestMaker(RawEffects.response, zuoraRestConfig)
      _ <- UpdateAccountSFLinks(zuoraDeps.put)(SFPointer(SFContactId(s"cont$unique"), CRMAccountId(s"acc$unique"), Some(IdentityId(s"ident$unique"))))(testAccount).toApiGatewayOp("AddIdentityIdToAccount")
      basicInfo <- GetIdentityIdForAccount(zuoraDeps)(testAccount).toApiGatewayOp("GetIdentityIdForAccount")
    } yield basicInfo
    actual.toDisjunction should be(\/-(BasicInfo(s"cont$unique", s"acc$unique", Some(s"ident$unique"))))

  }

  it should "successfully CLEAR the identity id against dev" taggedAs EffectsTest in {

    val testAccount = AccountId("2c92c0f9624bbc5f016253e573970b16")

    val actual = for {
      zuoraRestConfig <- LoadConfigModule(Stage("DEV"), GetFromS3.fetchString)[ZuoraRestConfig].toApiGatewayOp("load config")
      zuoraDeps = ZuoraRestRequestMaker(RawEffects.response, zuoraRestConfig)
      _ <- UpdateAccountSFLinks(zuoraDeps.put)(SFPointer(SFContactId(s"random"), CRMAccountId(s"random"), None))(testAccount).toApiGatewayOp("AddIdentityIdToAccount")
      basicInfo <- GetIdentityIdForAccount(zuoraDeps)(testAccount).toApiGatewayOp("GetIdentityIdForAccount")
    } yield basicInfo.IdentityId__c
    actual.toDisjunction should be(\/-(None))

  }

}
