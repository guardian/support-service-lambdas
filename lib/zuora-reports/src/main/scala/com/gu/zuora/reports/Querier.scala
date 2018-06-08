package com.gu.zuora.reports

import com.gu.util.zuora.RestRequestMaker.{ClientFailableOp, GenericError, Requests}
import com.gu.zuora.reports.aqua.{AquaJobResponse, AquaQuery, AquaQueryRequest}
import play.api.libs.json.{Json, Reads}
import scalaz.{-\/, \/-}

object Querier {

  def apply[REQ](
    generateQuery: REQ => AquaQueryRequest,
    zuoraRequester: Requests
  )(querierRequest: REQ)(implicit reads: Reads[REQ]): ClientFailableOp[QuerierResponse] = {
    val aquaRequest = generateQuery(querierRequest)
    val aquaResponse = zuoraRequester.post[AquaQueryRequest, AquaJobResponse](aquaRequest, "batch-query/")
    toQuerierResponse(aquaResponse)
  }

  def toQuerierResponse(aquaResponse: ClientFailableOp[AquaJobResponse]): ClientFailableOp[QuerierResponse] = {
    aquaResponse match {
      case \/-(AquaJobResponse(status, name, _, Some(jobId))) if (status.toLowerCase == "submitted") => \/-(QuerierResponse(name, jobId))
      case \/-(zuoraResponse) => -\/(GenericError(s"unexpected response from zuora: $zuoraResponse"))
      case -\/(error) => -\/(error)
    }
  }
}

case class QuerierResponse(name: String, jobId: String)

object QuerierResponse {
  implicit val writes = Json.writes[QuerierResponse]
}
