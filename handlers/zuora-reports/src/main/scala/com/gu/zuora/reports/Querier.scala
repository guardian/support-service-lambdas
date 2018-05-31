package com.gu.zuora.reports

import com.gu.util.zuora.RestRequestMaker.{ClientFailableOp, GenericError, Requests}
import com.gu.zuora.reports.aqua.{AquaQuery, AquaQueryRequest, ZuoraAquaResponse}
import play.api.libs.json.Json
import scalaz.{-\/, \/-}

object Querier {

  def apply(zuoraRequester: Requests, querierRequest: QuerierRequest): ClientFailableOp[QuerierResponse] = {
    val aquaRequest = toAquaQueryRequest(querierRequest)
    val aquaResponse = zuoraRequester.post[AquaQueryRequest, ZuoraAquaResponse](aquaRequest, "batch-query/")
    toQuerierResponse(aquaResponse)
  }

  def toQuerierResponse(aquaResponse: ClientFailableOp[ZuoraAquaResponse]): ClientFailableOp[QuerierResponse] = {
    aquaResponse match {
      case \/-(ZuoraAquaResponse(status, name, _, _, _, Some(jobId))) if (status.toLowerCase == "submitted") => \/-(QuerierResponse(name, jobId))
      case \/-(zuoraResponse) => -\/(GenericError(s"unexpected response from zuora: $zuoraResponse"))
      case -\/(error) => -\/(error)
    }
  }

  def toAquaQuery(query: Query) = AquaQuery(
    name = query.name,
    query = query.query
  )

  def toAquaQueryRequest(request: QuerierRequest) = AquaQueryRequest(
    name = request.name,
    queries = request.queries.map(toAquaQuery)
  )
}

case class QuerierResponse(name: String, jobId: String)

object QuerierResponse {
  implicit val writes = Json.writes[QuerierResponse]
}

case class Query(name: String, query: String)

case class QuerierRequest(name: String, queries: Seq[Query])

object Query {
  implicit val reads = Json.reads[Query]
}

object QuerierRequest {
  implicit val reads = Json.reads[QuerierRequest]
}

