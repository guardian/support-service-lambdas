package com.gu.digitalSubscriptionExpiry.zuora
import java.io

import com.gu.digitalSubscriptionExpiry.Handler.StepsConfig
import com.gu.digitalSubscriptionExpiry.zuora.GetAccountSummary.{AccountId, AccountSummaryResult}
import com.gu.effects.{S3ConfigLoad, RawEffects}
import com.gu.test.EffectsTest
import com.gu.util.zuora.ZuoraRestRequestMaker
import com.gu.util.config.{LoadConfig, Stage}
import org.scalatest.{FlatSpec, Matchers}
import scalaz.syntax.std.either._
import scalaz.{\/, \/-}

class GetAccountSummaryEffectsTest extends FlatSpec with Matchers {
  it should "successfully get account summary against dev" taggedAs EffectsTest in {
    val testAccountId = AccountId("2c92c0f86078c4d4016079e1402d6536")

    val actual: \/[io.Serializable, AccountSummaryResult] = for {
      configAttempt <- S3ConfigLoad.load(Stage("DEV")).toEither.disjunction
      config <- LoadConfig.parseConfig[StepsConfig](configAttempt)
      zuoraRequests = ZuoraRestRequestMaker(RawEffects.response, config.stepsConfig.zuoraRestConfig)
      subscription <- GetAccountSummary(zuoraRequests)(testAccountId)
    } yield {
      subscription
    }

    val expected = AccountSummaryResult(
      accountId = testAccountId,
      billToLastName = "Brown",
      billToPostcode = Some("SW13 8EB"),
      soldToLastName = "Brown",
      soldToPostcode = Some("SW13 8EB")
    )

    actual should be(\/-(expected))
  }
}
