package com.gu.identityRetention

import com.gu.identityRetention.Types.AccountId
import com.gu.util.zuora.SafeQueryBuilder.ToNel
import org.scalatest.{FlatSpec, Matchers}
import scalaz.\/-

class SubscriptionsForAccountsTest extends FlatSpec with Matchers {

  it should "build a valid query for a single account" in {
    val query = SubscriptionsForAccounts.buildQuery(ToNel.literal(
      AccountId("acc123")
    ))
    val expectedQuery = s"select id, name, status, termEndDate from subscription where status != 'Expired' and accountId = 'acc123'"
    query.map(_.queryString) should be(\/-(expectedQuery))
  }

  it should "build a valid query for multiple accounts" in {
    val query = SubscriptionsForAccounts.buildQuery(ToNel.literal(
      AccountId("acc123"),
      AccountId("acc321")
    ))
    val expectedQuery =
      s"""select id, name, status, termEndDate from subscription
         | where status != 'Expired' and accountId = 'acc123'
            | or status != 'Expired' and accountId = 'acc321'
         |""".stripMargin.replaceAll("\n", "")
    query.map(_.queryString) should be(\/-(expectedQuery))
  }

}
