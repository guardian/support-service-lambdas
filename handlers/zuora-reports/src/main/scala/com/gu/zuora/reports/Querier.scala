package com.gu.zuora.reports.aqua

import com.gu.util.zuora.RestRequestMaker.{ClientFailableOp, Requests}
import com.gu.util.zuora.aqua.ZuoraAquaResponse
import play.api.libs.json.Json

object Querier {

  def apply(zuoraRequester: Requests, querierRequest: QuerierRequest) /*(querierRequest: QuerierRequest)*/ : ClientFailableOp[QuerierResponse] = {
    val aquaRequest = AquaQueryRequest.fromQuerierRequest(querierRequest)
    zuoraRequester.post[AquaQueryRequest, ZuoraAquaResponse](aquaRequest, "batch-query/").map {
      aquaResponse =>
        val jobId = aquaResponse.id.getOrElse("") // todo see how to improve error handling with zuora's inconsistent responses
        QuerierResponse(jobId, aquaResponse.status)
    }
  }
}

case class QuerierResponse(jobId: String, status: String)
object QuerierResponse {
  implicit val writes = Json.writes[QuerierResponse]
}

case class Query(name: String, query: String)

case class AquaQuery(name: String, query: String, `type`: String = "zoqlexport")

trait ZuoraAquaRequest

case class QuerierRequest(name: String, queries: Seq[Query]) extends ZuoraAquaRequest

object Query {
  implicit val reads = Json.reads[Query]
}

object QuerierRequest {
  implicit val reads = Json.reads[QuerierRequest]
}

case class AquaQueryRequest(
  format: String = "csv",
  version: String = "1.0",
  name: String,
  encrypted: String = "none",
  useQueryLabels: String = "true",
  dateTimeUtc: String = "true",
  queries: Seq[AquaQuery]
)

object AquaQuery {
  implicit val writer = Json.writes[AquaQuery]

  def fromQuery(aquaQuery: Query) = AquaQuery(
    name = aquaQuery.name,
    query = aquaQuery.query
  )
}

object AquaQueryRequest {
  implicit val writer = Json.writes[AquaQueryRequest]

  def fromQuerierRequest(request: QuerierRequest) = AquaQueryRequest(
    name = request.name,
    queries = request.queries.map(AquaQuery.fromQuery)
  )
}

