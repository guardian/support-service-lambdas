package com.gu.zuora.retention.query

import java.time.LocalDate

import com.gu.zuora.reports.aqua.{AquaQuery, AquaQueryRequest}
import play.api.libs.json.Json
import org.scalatest.matchers.should.Matchers._
import org.scalatest.matchers
import org.scalatest.flatspec.AsyncFlatSpec

class RetentionQueryRequestTest extends AsyncFlatSpec {

  it should "deserialise zuora retention query request " in {

    val jsonRequest = Json.parse(
      """{
        "cutOffDate" : "2012-11-03",
        "dryRun": true
        |}""".stripMargin,
    )

    val expected = RetentionQueryRequest(Some(LocalDate.of(2012, 11, 3)), true)
    val actual = jsonRequest.as[RetentionQueryRequest]

    actual.shouldBe(expected)

  }
  it should "convert to Aqua request with explicit cut off date" in {
    val retentionQuery = RetentionQueryRequest(Some(LocalDate.of(2012, 12, 31)), false)
    toAquaRequest(retentionQuery) shouldBe expectedQuery("2012-12-31")
  }

  it should "use 30 months ago as the default cut off date" in {
    val retentionQuery = RetentionQueryRequest(None, false)
    toAquaRequest(retentionQuery) shouldBe expectedQuery("2013-05-23")
  }

  def toAquaRequest = ToAquaRequest(now) _
  val now: () => LocalDate = () => LocalDate.of(2015, 11, 23)

  def expectedQuery(dateStr: String) = {
    val expectedExclusionQuery = AquaQuery(
      name = "exclusionQuery",
      query = s"""
                 |SELECT
                 | Account.CrmId
                 |FROM
                 | Subscription
                 |WHERE
                 | Account.CrmId != '' AND
                 | Account.CrmId IS NOT NULL AND
                 | Status != 'Expired' AND
                 | Status != 'Draft'
                 |GROUP BY
                 | Account.CrmId
                 |HAVING
                 |  MAX(Status) = 'Cancelled' AND
                 |  (MIN(Status) = 'Active' OR MAX(SubscriptionEndDate) >= '$dateStr')
                 |ORDER BY
                 |  Account.CrmId
    """.stripMargin,
    )

    val expectedCandidatesQuery = AquaQuery(
      name = "candidatesQuery",
      query = s"""
           |SELECT
           |  Account.Id, Account.CrmId
           |FROM
           |  Subscription
           |WHERE
           |  Account.Status != 'Canceled' AND
           |  Account.CrmId != '' AND
           |  Account.CrmId IS NOT NULL AND
           |  (Account.ProcessingAdvice__c != 'DoNotProcess' OR Account.ProcessingAdvice__c IS NULL) AND
           |  Subscription.Status = 'Cancelled' AND
           |  SubscriptionEndDate <= '$dateStr' AND
           |  SubscriptionEndDate > '1000-01-01'
           |ORDER BY
           |  Account.CrmId
    """.stripMargin,
    )

    AquaQueryRequest(
      name = "zuora-retention",
      queries = List(expectedCandidatesQuery, expectedExclusionQuery),
    )
  }
}
