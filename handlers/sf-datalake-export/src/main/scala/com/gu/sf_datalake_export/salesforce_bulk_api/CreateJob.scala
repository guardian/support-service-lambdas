package com.gu.sf_datalake_export.salesforce_bulk_api

import com.gu.util.resthttp.RestOp._
import com.gu.util.resthttp.RestRequestMaker._
import com.gu.util.resthttp.Types.{ClientFailableOp, ClientSuccess, GenericError}
import com.gu.util.resthttp.{HttpOp, RestRequestMaker}
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

  trait SfObjectType {
    def name: String
  }

  case class CreateJobRequest(
    objectType : String,
    maybeChunkSize: Option[Int]
  )



  def apply(post: HttpOp[RestRequestMaker.PostRequest, JsValue]): CreateJobRequest => ClientFailableOp[JobId] =
    post.setupRequest[CreateJobRequest] {request:CreateJobRequest =>
      val wireRequest = WireRequest(request.objectType)

      val maybeChunkingHeader = request.maybeChunkSize.map { chunkSize =>
        Header(name = "Sforce-Enable-PKChunking", value = s"chunkSize=$chunkSize")
      }
     val headers = maybeChunkingHeader.toList
    val relativePath = RelativePath("/services/async/44.0/job")
      PostRequest(wireRequest, relativePath, headers)
    }.parse[WireResponse].map { wireResponse => JobId(wireResponse.id) }.runRequest

}
