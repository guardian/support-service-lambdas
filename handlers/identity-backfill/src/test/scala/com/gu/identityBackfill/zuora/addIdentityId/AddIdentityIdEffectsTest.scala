package com.gu.identityBackfill.zuora.addIdentityId

import com.gu.effects.{GetFromS3, RawEffects}
import com.gu.identityBackfill.TypeConvert._
import com.gu.identityBackfill.Types
import com.gu.identityBackfill.salesforce.UpdateSalesforceIdentityId.IdentityId
import com.gu.identityBackfill.zuora.AddIdentityIdToAccount
import com.gu.test.EffectsTest
import com.gu.util.config.{LoadConfigModule, Stage}
import com.gu.util.reader.Types._
import com.gu.util.zuora.{ZuoraRestConfig, ZuoraRestRequestMaker}

import scala.util.Random
import org.scalatest.flatspec.AnyFlatSpec
import org.scalatest.matchers.should.Matchers

// run this manually
class AddIdentityIdEffectsTest extends AnyFlatSpec with Matchers {

  it should "successfully update the identity id against dev" taggedAs EffectsTest in {

    val unique = s"${Random.nextInt(10000)}"
    val testAccount = Types.AccountId("2c92c0f9624bbc5f016253e573970b16")

    val actual = for {
      zuoraRestConfig <- LoadConfigModule(Stage("DEV"), GetFromS3.fetchString)[ZuoraRestConfig]
        .toApiGatewayOp("load config")
      zuoraDeps = ZuoraRestRequestMaker(RawEffects.response, zuoraRestConfig)
      _ <- AddIdentityIdToAccount(zuoraDeps)(testAccount, IdentityId(unique)).toApiGatewayOp("AddIdentityIdToAccount")
      identityId <- GetIdentityIdForAccount(zuoraDeps)(testAccount).toApiGatewayOp("GetIdentityIdForAccount")
    } yield {
      identityId
    }
    actual.toDisjunction should be(Right(IdentityId(unique)))

  }

}
