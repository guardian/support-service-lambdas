package com.gu.identityRetention

import java.time.LocalDate

import com.gu.effects.{GetFromS3, RawEffects}
import com.gu.identityRetention.Types.AccountId
import com.gu.test.EffectsTest
import com.gu.util.config.{LoadConfigModule, Stage}
import com.gu.util.zuora.{ZuoraQuery, ZuoraRestConfig, ZuoraRestRequestMaker}
import cats.data.NonEmptyList
import org.scalatest.flatspec.AnyFlatSpec
import org.scalatest.matchers.should.Matchers

class SubscriptionsForAccountsEffectsTest extends AnyFlatSpec with Matchers {

  it should "successfull query multiple accounts" taggedAs EffectsTest in {

    val testAccountIds = NonEmptyList(
      AccountId("2c92c0f86371efdc0163871a9ad72274"),
      List(AccountId("2c92c0f86371f0360163871d94eb0e68")),
    )

    val expectedEndDates = List(
      LocalDate.of(2019, 5, 21),
      LocalDate.of(2018, 4, 4),
    )

    val actual = for {
      zuoraRestConfig <- LoadConfigModule(Stage("DEV"), GetFromS3.fetchString)[ZuoraRestConfig]
      zuoraQuerier = ZuoraQuery(ZuoraRestRequestMaker(RawEffects.response, zuoraRestConfig))
      subsForAccounts = SubscriptionsForAccounts(zuoraQuerier) _
      subs <- subsForAccounts(testAccountIds).toDisjunction
    } yield {
      subs
    }
    actual.map(_.map(_.TermEndDate)) should be(Right(expectedEndDates))

  }

}
