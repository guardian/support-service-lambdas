package com.gu.identityBackfill.zuora

import com.gu.identityBackfill.Types.AccountId
import com.gu.identityBackfill.supporterProductData.{ZuoraRatePlan, ZuoraSubscription}
import com.gu.util.resthttp.Types.{ClientFailableOp, ClientSuccess, GenericError}
import com.gu.util.zuora.SafeQueryBuilder.SafeQuery
import com.gu.util.zuora.ZuoraQuery.{QueryResult, ZuoraQuerier}
import org.scalatest.flatspec.AnyFlatSpec
import org.scalatest.matchers.should.Matchers
import play.api.libs.json.Reads

import java.time.LocalDate
import scala.collection.mutable.ListBuffer

class GetSubscriptionsForAccountTest extends AnyFlatSpec with Matchers {

  import GetSubscriptionsForAccount.{WireRatePlan, WireSubscription}

  private def queryResult[A](records: List[A]): ClientFailableOp[QueryResult[A]] =
    ClientSuccess(QueryResult(records, records.size, done = true, queryLocator = None))

  private class QuerierStub(responses: List[ClientFailableOp[QueryResult[_]]]) extends ZuoraQuerier {
    val queries: ListBuffer[String] = ListBuffer.empty
    private var remaining: List[ClientFailableOp[QueryResult[_]]] = responses

    override def apply[T: Reads](query: SafeQuery): ClientFailableOp[QueryResult[T]] = {
      queries += query.queryString
      remaining match {
        case head :: tail =>
          remaining = tail
          head.asInstanceOf[ClientFailableOp[QueryResult[T]]]
        case Nil =>
          GenericError(s"unexpected query (no canned response left): ${query.queryString}")
      }
    }
  }

  it should "return an empty list when the account has no active subscriptions" in {
    val querier = new QuerierStub(List(queryResult[WireSubscription](Nil)))

    val result = GetSubscriptionsForAccount(querier)(AccountId("acc-1"))

    result shouldBe ClientSuccess(Nil)
    querier.queries should have size 1
    querier.queries.head should include("FROM Subscription")
    querier.queries.head should include("AccountId='acc-1'")
    querier.queries.head should include("Status='Active'")
  }

  it should "fetch rate plans for each active subscription and build a ZuoraSubscription" in {
    val sub = WireSubscription(
      Id = "sub-id-1",
      Name = "A-S00000001",
      TermEndDate = "2026-04-29",
      ContractEffectiveDate = "2025-04-29",
    )
    val ratePlan = WireRatePlan(ProductRatePlanId = "rp-id", Name = "Supporter Plus V2 - Monthly")

    val querier = new QuerierStub(
      List(
        queryResult(List(sub)),
        queryResult(List(ratePlan)),
      ),
    )

    val result = GetSubscriptionsForAccount(querier)(AccountId("acc-1"))

    result shouldBe ClientSuccess(
      List(
        ZuoraSubscription(
          subscriptionName = "A-S00000001",
          termEndDate = LocalDate.parse("2026-04-29"),
          contractEffectiveDate = LocalDate.parse("2025-04-29"),
          ratePlans = List(ZuoraRatePlan("rp-id", "Supporter Plus V2 - Monthly")),
        ),
      ),
    )
    querier.queries should have size 2
    querier.queries(1) should include("FROM RatePlan")
    querier.queries(1) should include("SubscriptionId='sub-id-1'")
  }

  it should "fetch rate plans for every subscription" in {
    val sub1 = WireSubscription("sub-1", "A-S001", "2026-01-01", "2025-01-01")
    val sub2 = WireSubscription("sub-2", "A-S002", "2026-06-01", "2025-06-01")
    val rpA = WireRatePlan("rp-A", "Plan A")
    val rpB = WireRatePlan("rp-B", "Plan B")

    val querier = new QuerierStub(
      List(
        queryResult(List(sub1, sub2)),
        queryResult(List(rpA)),
        queryResult(List(rpB)),
      ),
    )

    val result = GetSubscriptionsForAccount(querier)(AccountId("acc-1"))

    result shouldBe a[ClientSuccess[_]]
    val subs = result.toDisjunction.toOption.get
    subs.map(_.subscriptionName) shouldBe List("A-S001", "A-S002")
    subs.flatMap(_.ratePlans) should contain theSameElementsAs List(
      ZuoraRatePlan("rp-A", "Plan A"),
      ZuoraRatePlan("rp-B", "Plan B"),
    )
    querier.queries should have size 3
  }

  it should "propagate errors from the subscription query" in {
    val querier = new QuerierStub(List(GenericError("boom")))

    val result = GetSubscriptionsForAccount(querier)(AccountId("acc-1"))

    result.isFailure shouldBe true
  }

  it should "fail when a date cannot be parsed" in {
    val sub = WireSubscription("sub-id-1", "A-S001", "not-a-date", "2025-01-01")
    val querier = new QuerierStub(
      List(
        queryResult(List(sub)),
        queryResult[WireRatePlan](Nil),
      ),
    )

    val result = GetSubscriptionsForAccount(querier)(AccountId("acc-1"))

    result.isFailure shouldBe true
  }
}
