package com.gu.zuora.retention.query

import java.time.LocalDate
import java.time.format.DateTimeFormatter

import com.gu.zuora.reports.QuerierRequest
import com.gu.zuora.reports.aqua.{AquaQuery, AquaQueryRequest}
import play.api.libs.json.Json

case class RetentionQueryRequest(cutOffDate: Option[LocalDate], dryRun: Boolean) extends QuerierRequest

object RetentionQueryRequest {
  implicit val reads = Json.reads[RetentionQueryRequest]
}

object ToAquaRequest {
  val exclusionQueryName = "exclusionQuery"
  val candidatesQueryName = "candidatesQuery"
  def apply(getCurrentDate: () => LocalDate)(request: RetentionQueryRequest): AquaQueryRequest = {

    val filterDate = request.cutOffDate getOrElse getCurrentDate().minusMonths(30)
    val dateStr = filterDate.format(DateTimeFormatter.ISO_LOCAL_DATE)
    val exclusionQuery = AquaQuery(
      name = exclusionQueryName,
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
    val candidatesQuery = AquaQuery(
      name = candidatesQueryName,
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
      queries = List(candidatesQuery, exclusionQuery),
    )
  }
}
