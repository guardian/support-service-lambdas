package com.gu.zuora.retention

import com.gu.effects.RawEffects
import com.gu.zuora.reports.ReportHandlers
import com.gu.zuora.retention.query.{RetentionQueryRequest, ToAquaRequest}

object Handlers extends ReportHandlers[RetentionQueryRequest] {
  override val reportsBucketPrefix = "zuora-retention"
  override def toQueryRequest = ToAquaRequest(RawEffects.now().toLocalDate) _
  override val queryReads = RetentionQueryRequest.reads
}
