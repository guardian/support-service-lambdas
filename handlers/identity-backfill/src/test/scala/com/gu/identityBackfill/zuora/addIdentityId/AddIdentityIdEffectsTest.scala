package com.gu.identityBackfill.zuora.addIdentityId

import com.gu.effects.{RawEffects, S3ConfigLoad}
import com.gu.identityBackfill.Handler.StepsConfig
import com.gu.identityBackfill.Types
import com.gu.identityBackfill.Types.IdentityId
import com.gu.identityBackfill.zuora.AddIdentityIdToAccount
import com.gu.test.EffectsTest
import com.gu.util.zuora.ZuoraRestRequestMaker
import com.gu.util.config.{LoadConfig, Stage}
import org.scalatest.{FlatSpec, Matchers}
import scalaz.\/-
import scalaz.syntax.std.either._
import scala.util.Random

// run this manually
class AddIdentityIdEffectsTest extends FlatSpec with Matchers {

  it should "successfully update the identity id against dev" taggedAs EffectsTest in {

    val unique = s"${Random.nextInt(10000)}"
    val testAccount = Types.AccountId("2c92c0f9624bbc5f016253e573970b16")

    val actual = for {
      configAttempt <- S3ConfigLoad.load(Stage("DEV")).toEither.disjunction
      config <- LoadConfig.parseConfig[StepsConfig](configAttempt)
      zuoraDeps = ZuoraRestRequestMaker(RawEffects.response, config.stepsConfig.zuoraRestConfig)
      _ <- AddIdentityIdToAccount(zuoraDeps)(testAccount, IdentityId(unique))
      identityId <- GetIdentityIdForAccount(zuoraDeps)(testAccount)
    } yield {
      identityId
    }
    actual should be(\/-(IdentityId(unique)))

  }

}
