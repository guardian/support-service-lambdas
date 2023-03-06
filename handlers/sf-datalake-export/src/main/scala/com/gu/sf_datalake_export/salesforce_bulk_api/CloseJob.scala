package com.gu.sf_datalake_export.salesforce_bulk_api

import com.gu.sf_datalake_export.salesforce_bulk_api.CreateJob.JobId
import com.gu.util.resthttp.HttpOp.HttpOpWrapper
import com.gu.util.resthttp.RestRequestMaker._
import com.gu.util.resthttp.Types.ClientSuccess
import play.api.libs.json.{JsValue, Json}

object CloseJob {

  case class WireSfCloseJobRequest(
      state: String = "Closed",
  )

  object WireSfCloseJobRequest {
    implicit val writes = Json.writes[WireSfCloseJobRequest]
  }

  def toRequest(jobId: JobId): PostRequest = {
    val relativePath = RelativePath(s"/services/async/44.0/job/${jobId.value}")
    PostRequest(WireSfCloseJobRequest(), relativePath)
  }

  val wrapper = HttpOpWrapper[JobId, PostRequest, JsValue, Unit](toRequest, _ => ClientSuccess(()))

}
