package com.gu.zuora.retention

import com.gu.zuora.reports.ReportHandlers
import com.gu.zuora.retention.query.{ConstructQuery, RetentionQueryRequest}

object Handlers extends ReportHandlers[RetentionQueryRequest] {
  override val reportsBucketPrefix = "zuora-retention"

  override def toQueryRequest = ConstructQuery.apply
  override val queryReads = RetentionQueryRequest.reads
}
