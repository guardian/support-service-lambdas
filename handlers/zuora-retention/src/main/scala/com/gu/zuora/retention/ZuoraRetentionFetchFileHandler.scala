package com.gu.zuora.retention

import java.io.{InputStream, OutputStream}

import com.amazonaws.services.lambda.runtime.Context
import com.gu.zuora.reports.handlers.FetchFileHandler

object ZuoraRetentionFetchFileHandler {
  // this is the entry point
  // it's referenced by the cloudformation so make sure you keep it in step
  def apply: (InputStream, OutputStream, Context) => Unit = FetchFileHandler("zuora-retention")
}
