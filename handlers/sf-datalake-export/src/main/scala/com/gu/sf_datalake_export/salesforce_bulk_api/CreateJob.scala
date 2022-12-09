package com.gu.sf_datalake_export.salesforce_bulk_api

import com.gu.sf_datalake_export.salesforce_bulk_api.BulkApiParams.{BatchSize, SfObjectName}
import com.gu.util.resthttp.HttpOp.HttpOpWrapper
import com.gu.util.resthttp.RestRequestMaker
import com.gu.util.resthttp.RestRequestMaker._
import play.api.libs.json.{JsValue, Json}

object CreateJob {

  case class WireRequest(
      operation: String,
      concurrencyMode: String,
      contentType: String,
      `object`: String,
  )

  object WireRequest {
    def apply(objectToQuery: String): WireRequest = WireRequest(
      operation = "query",
      concurrencyMode = "Parallel",
      contentType = "CSV",
      `object` = objectToQuery,
    )
  }

  case class WireResponse(id: String)

  object WireResponse {
    implicit val reads = Json.reads[WireResponse]
  }

  implicit val writes = Json.writes[WireRequest]

  case class JobId(value: String) extends AnyVal

  object JobId {
    implicit val format = Json.format[JobId]
  }

  case class CreateJobRequest(
      objectType: SfObjectName,
      maybeChunkSize: Option[BatchSize],
  )

  def toRequest(request: CreateJobRequest): PostRequestWithHeaders = {
    val wireRequest = WireRequest(request.objectType.value)
    val maybeChunkingHeader = request.maybeChunkSize.map { chunkSize =>
      Header(name = "Sforce-Enable-PKChunking", value = s"chunkSize=${chunkSize.value}")
    }
    val headers = maybeChunkingHeader.toList
    val relativePath = RelativePath("/services/async/44.0/job")
    PostRequestWithHeaders(wireRequest, relativePath, headers)
  }

  def toResponse(wireResponse: WireResponse): JobId = JobId(wireResponse.id)

  val wrapper: HttpOpWrapper[CreateJobRequest, PostRequestWithHeaders, JsValue, JobId] =
    HttpOpWrapper[CreateJobRequest, PostRequestWithHeaders, JsValue, JobId](
      toRequest,
      RestRequestMaker.toResult[WireResponse](_).map(toResponse),
    )

}
