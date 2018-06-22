package com.gu.zuora.reports

import com.gu.util.zuora.RestRequestMaker.{ClientFailableOp, GenericError, Requests}
import com.gu.zuora.reports.aqua.{AquaJobResponse, AquaQueryRequest}
import play.api.libs.json.Json
import scalaz.{-\/, \/-}

trait QuerierRequest {
  val dryRun: Boolean
}

object Querier {

  def apply[REQ <: QuerierRequest](
    generateQuery: REQ => AquaQueryRequest,
    zuoraRequester: Requests
  )(querierRequest: REQ): ClientFailableOp[QuerierResponse] = {
    val aquaRequest = generateQuery(querierRequest)
    val aquaResponse = zuoraRequester.post[AquaQueryRequest, AquaJobResponse](aquaRequest, "batch-query/")
    toQuerierResponse(aquaResponse, querierRequest.dryRun)
  }

  def toQuerierResponse(aquaResponse: ClientFailableOp[AquaJobResponse], dryRun: Boolean): ClientFailableOp[QuerierResponse] = {
    aquaResponse match {
      case \/-(AquaJobResponse(status, name, _, Some(jobId))) if (status.toLowerCase == "submitted") => \/-(QuerierResponse(name, jobId, dryRun))
      case \/-(zuoraResponse) => -\/(GenericError(s"unexpected response from zuora: $zuoraResponse"))
      case -\/(error) => -\/(error)
    }
  }
}

case class QuerierResponse(name: String, jobId: String, dryRun: Boolean)

object QuerierResponse {
  implicit val writes = Json.writes[QuerierResponse]
}
