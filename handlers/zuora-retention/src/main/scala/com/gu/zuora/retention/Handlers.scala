package com.gu.zuora.retention

import com.gu.zuora.reports.ReportHandlers
import com.gu.zuora.retention.query.{ToAquaRequest, RetentionQueryRequest}

object Handlers extends ReportHandlers[RetentionQueryRequest] {
  override val reportsBucketPrefix = "zuora-retention"
  override def toQueryRequest = ToAquaRequest.apply
  override val queryReads = RetentionQueryRequest.reads
}
