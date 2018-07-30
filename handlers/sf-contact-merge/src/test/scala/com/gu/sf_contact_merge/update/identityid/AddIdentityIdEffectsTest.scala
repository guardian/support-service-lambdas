package com.gu.sf_contact_merge.update.identityid

import com.gu.effects.{GetFromS3, RawEffects}
import com.gu.sf_contact_merge.TypeConvert._
import com.gu.sf_contact_merge.update.SetOrClearZuoraIdentityId
import com.gu.sf_contact_merge.validate.GetContacts.{AccountId, IdentityId}
import com.gu.test.EffectsTest
import com.gu.util.config.{LoadConfigModule, Stage}
import com.gu.util.reader.Types._
import com.gu.util.zuora.{ZuoraRestConfig, ZuoraRestRequestMaker}
import org.scalatest.{FlatSpec, Matchers}
import scalaz.\/-

import scala.util.Random

// run this manually
class AddIdentityIdEffectsTest extends FlatSpec with Matchers {

  it should "successfully UPDATE the identity id against dev" taggedAs EffectsTest in {

    val unique = s"${Random.nextInt(10000)}"
    val testAccount = AccountId("2c92c0f9624bbc5f016253e573970b16")

    val actual = for {
      zuoraRestConfig <- LoadConfigModule(Stage("DEV"), GetFromS3.fetchString)[ZuoraRestConfig].toApiGatewayOp("load config")
      zuoraDeps = ZuoraRestRequestMaker(RawEffects.response, zuoraRestConfig)
      _ <- SetOrClearZuoraIdentityId(zuoraDeps)(Some(IdentityId(unique)))(testAccount).toApiGatewayOp("AddIdentityIdToAccount")
      identityId <- GetIdentityIdForAccount(zuoraDeps)(testAccount).toApiGatewayOp("GetIdentityIdForAccount")
    } yield {
      identityId
    }
    actual.toDisjunction should be(\/-(Some(unique)))

  }

  it should "successfully CLEAR the identity id against dev" taggedAs EffectsTest in {

    val testAccount = AccountId("2c92c0f9624bbc5f016253e573970b16")

    val actual = for {
      zuoraRestConfig <- LoadConfigModule(Stage("DEV"), GetFromS3.fetchString)[ZuoraRestConfig].toApiGatewayOp("load config")
      zuoraDeps = ZuoraRestRequestMaker(RawEffects.response, zuoraRestConfig)
      _ <- SetOrClearZuoraIdentityId(zuoraDeps)(None)(testAccount).toApiGatewayOp("AddIdentityIdToAccount")
      identityId <- GetIdentityIdForAccount(zuoraDeps)(testAccount).toApiGatewayOp("GetIdentityIdForAccount")
    } yield {
      identityId
    }
    actual.toDisjunction should be(\/-(None))

  }

}
