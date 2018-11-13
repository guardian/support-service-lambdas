package com.gu.sf_datalake_export.salesforce_bulk_api

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
      `object` = objectToQuery
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
    objectType : String,
    maybeChunkSize: Option[Int]
  )

  def toRequest(request:CreateJobRequest):PostRequest = {
      val wireRequest = WireRequest(request.objectType)
      val maybeChunkingHeader = request.maybeChunkSize.map { chunkSize =>
        Header(name = "Sforce-Enable-PKChunking", value = s"chunkSize=$chunkSize")
      }
      val headers = maybeChunkingHeader.toList
      val relativePath = RelativePath("/services/async/44.0/job")
      PostRequest(wireRequest, relativePath, headers)
  }
  def toResponse(wireResponse: WireResponse) : JobId =  JobId(wireResponse.id)

  val wrapper: HttpOpWrapper[CreateJobRequest, PostRequest, JsValue, JobId] =
    HttpOpWrapper[CreateJobRequest, PostRequest, JsValue, JobId](toRequest, RestRequestMaker.toResult[WireResponse](_).map(toResponse))

}
