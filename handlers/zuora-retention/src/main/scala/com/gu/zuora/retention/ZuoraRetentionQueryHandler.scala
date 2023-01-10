package com.gu.zuora.retention

import java.io.{InputStream, OutputStream}

import com.amazonaws.services.lambda.runtime.Context
import com.gu.effects.RawEffects
import com.gu.zuora.reports.handlers.QueryHandler
import com.gu.zuora.retention.query.{RetentionQueryRequest, ToAquaRequest}

object ZuoraRetentionQueryHandler {

  // this is the entry point
  // it's referenced by the cloudformation so make sure you keep it in step
  def apply(inputStream: InputStream, outputStream: OutputStream, context: Context): Unit = {
    QueryHandler[RetentionQueryRequest](
      reportsBucketPrefix = "zuora-retention",
      toQueryRequest = ToAquaRequest(RawEffects.now().toLocalDate _),
      queryReads = RetentionQueryRequest.reads,
    )(inputStream, outputStream, context)
  }
}
