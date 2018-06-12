package com.gu.zuora.retention.query

import java.time.LocalDate
import java.time.format.DateTimeFormatter

import com.gu.zuora.reports.aqua.{AquaQuery, AquaQueryRequest}
import play.api.libs.json.Json

case class RetentionQueryRequest(cutOffDate: LocalDate) //todo check if this should be localdate or some other format

object RetentionQueryRequest {
  implicit val reads = Json.reads[RetentionQueryRequest]
}

object ToAquaRequest {
  val exclusionQueryName = "exclusionQuery"
  val candidatesQueryName = "candidatesQuery"
  def apply(request: RetentionQueryRequest): AquaQueryRequest = {
    val dateStr = request.cutOffDate.format(DateTimeFormatter.ISO_LOCAL_DATE)
    val exclusionQuery = AquaQuery(
      name = exclusionQueryName,
      query =
        s"""
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
           |  (MIN(Status) = 'Active' OR MAX(SubscriptionEndDate) >= '$dateStr')
    """.stripMargin
    )
    val candidatesQuery = AquaQuery(
      name = candidatesQueryName,
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
           |  SubscriptionEndDate <= '$dateStr'
    """.stripMargin
    )
    AquaQueryRequest(
      name = "zuora-retention",
      queries = List(candidatesQuery, exclusionQuery)
    )
  }
}
