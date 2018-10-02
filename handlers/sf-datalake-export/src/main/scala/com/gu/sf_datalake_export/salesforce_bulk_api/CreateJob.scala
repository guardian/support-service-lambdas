package com.gu.sf_datalake_export.salesforce_bulk_api

import com.gu.util.resthttp.{HttpOp, RestRequestMaker}
import com.gu.util.resthttp.RestRequestMaker._
import com.gu.util.resthttp.Types.{ClientFailableOp, ClientSuccess, GenericError}
import play.api.libs.json.{JsSuccess, JsValue, Json, Reads}
import com.gu.util.resthttp.RestOp._

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

  object SfObjectType {
    val allTypes = List(SfContact)

    def fromString(typeName: String) = allTypes.find(_.name.equalsIgnoreCase(typeName)).map(ClientSuccess(_)).getOrElse(GenericError(s"invalid sf object type $typeName"))

  }

  object SfContact extends SfObjectType {
    override def name = "Contact"
  }

  def apply(post: HttpOp[RestRequestMaker.PostRequest, JsValue]): SfObjectType => ClientFailableOp[JobId] =
    post.setupRequest[SfObjectType] { objectType: SfObjectType =>
      val wireRequest = WireRequest(objectType.name)
      // val headers = List(Header("Sforce-Enable-PKChunking", "chunkSize=100000")) //figure out what the chunk size should be (depends on the query so maybe it should be a param)
      val headers = List.empty //do not enable chuncking for now to avoid executing to many batches
    val relativePath = RelativePath("/services/async/44.0/job")
      PostRequest(wireRequest, relativePath, headers)
    }.parse[WireResponse].map { wireResponse => JobId(wireResponse.id) }.runRequest

}
