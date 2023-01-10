package com.gu.identityRetention

import com.gu.identityRetention.Types.AccountId
import com.gu.util.resthttp.Types.ClientSuccess
import cats.data.NonEmptyList
import org.scalatest.flatspec.AnyFlatSpec
import org.scalatest.matchers.should.Matchers

class SubscriptionsForAccountsTest extends AnyFlatSpec with Matchers {

  it should "build a valid query for a single account" in {
    val query = SubscriptionsForAccounts.buildQuery(
      NonEmptyList(
        AccountId("acc123"),
        Nil,
      ),
    )
    val expectedQuery =
      s"select id, name, status, termEndDate from subscription where status != 'Expired' and accountId = 'acc123'"
    query.map(_.queryString) should be(ClientSuccess(expectedQuery))
  }

  it should "build a valid query for multiple accounts" in {
    val query = SubscriptionsForAccounts.buildQuery(
      NonEmptyList(
        AccountId("acc123"),
        List(AccountId("acc321")),
      ),
    )
    val expectedQuery =
      s"""select id, name, status, termEndDate from subscription
         | where status != 'Expired' and accountId = 'acc123'
            | or status != 'Expired' and accountId = 'acc321'
         |""".stripMargin.replaceAll("\n", "")
    query.map(_.queryString) should be(ClientSuccess(expectedQuery))
  }

}
