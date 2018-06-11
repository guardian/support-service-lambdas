package com.gu.zuora.retention.query

import java.time.LocalDate

import com.gu.zuora.reports.aqua.{AquaQuery, AquaQueryRequest}
import org.scalatest.AsyncFlatSpec
import play.api.libs.json.Json
import org.scalatest.Matchers._

class RetentionQueryRequestTest extends AsyncFlatSpec {

  val jsonRequest = Json.parse(
    """{
        "cutOffDate" : "2012-11-03"
        |}""".stripMargin
  )

  it should "deserialise zuora retention query request " in {

    val expected = RetentionQueryRequest(LocalDate.of(2012, 11, 3))
    val actual = jsonRequest.as[RetentionQueryRequest]

    actual.shouldBe(expected)

  }

  it should "convert to Aqua request " in {
    val retentionQuery = RetentionQueryRequest(LocalDate.of(2012, 12, 31))

    val expectedExclusionQuery = AquaQuery(
      name = "exclusionQuery",
      query = s"""
                  |SELECT
                  | Account.CrmId
                  |FROM
                  | Subscription
                  |WHERE
                  | Account.CrmId != '' AND
                  | Status != 'Expired' AND
                  | Status != 'Draft'
                  |GROUP BY
                  | Account.CrmId
                  |HAVING
                  |  MAX(Status) = 'Cancelled' AND
                  |  (MIN(Status) = 'Active' OR
                  |  SubscriptionEndDate >= '2012-12-31')
    """.stripMargin
    )

    val expectedCandidatesQuery = AquaQuery(
      name = "candidatesQuery",
      query =
        s"""
           |SELECT
           |  Account.Id, Account.CrmId, BillToContact.Id, SoldToContact.Id
           |FROM
           |  Subscription
           |WHERE
           |  Account.Status != 'Canceled' AND
           |  (Account.ProcessingAdvice__c != 'DoNotProcess' OR Account.ProcessingAdvice__c IS NULL) AND
           |  Subscription.Status = 'Cancelled' AND
           |  SubscriptionEndDate <= '2012-12-31'
    """.stripMargin
    )

    val expected = AquaQueryRequest(
      name = "zuora-retention",
      queries = List(expectedCandidatesQuery, expectedExclusionQuery)
    )

    ToAquaRequest(retentionQuery) shouldBe expected
  }
}

