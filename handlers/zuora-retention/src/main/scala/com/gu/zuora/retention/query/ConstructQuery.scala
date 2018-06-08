package com.gu.zuora.retention.query

import java.time.LocalDate

import com.gu.zuora.reports.aqua.{AquaQuery, AquaQueryRequest}
import play.api.libs.json.Json

case class RetentionQueryRequest(cutOffDate: LocalDate) //todo check if this should be localdate or some other format
object RetentionQueryRequest {
  implicit val reads = Json.reads[RetentionQueryRequest]
}
object ConstructQuery {
  def apply(request: RetentionQueryRequest): AquaQueryRequest = {
    val dateStr = request.cutOffDate.formatted("YYYY-MM-DD")
    val statements =
      s"""
      SELECT
       Account.Id, Account.CrmId, BillToContact.Id, SoldToContact.Id
      FROM
       Subscription
      WHERE
       Account.Status != 'Canceled' AND
       (Account.ProcessingAdvice__c != 'DoNotProcess' OR Account.ProcessingAdvice__c IS NULL) AND
       Subscription.Status = 'Cancelled'
       AND SubscriptionEndDate <= '$dateStr'
    """.stripMargin

    val query1 = AquaQuery(
      name = "someName",
      query = statements
    )
    AquaQueryRequest(
      name = "zuora-retention",
      queries = List(query1)
    )
  }
}
