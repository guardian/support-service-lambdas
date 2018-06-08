package com.gu.zuora.retention

import com.gu.zuora.reports.ReportHandlers

object Handlers extends ReportHandlers {
  override val reportsBucketPrefix = "zuora-retention"
}
