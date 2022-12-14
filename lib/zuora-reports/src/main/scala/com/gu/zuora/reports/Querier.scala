package com.gu.zuora.reports

import com.gu.util.resthttp.RestRequestMaker.Requests
import com.gu.util.resthttp.Types._
import com.gu.zuora.reports.aqua.{AquaJobResponse, AquaQueryRequest}
import play.api.libs.json.Json

trait QuerierRequest {
  val dryRun: Boolean
}

object Querier {

  def apply[REQ <: QuerierRequest](
      generateQuery: REQ => AquaQueryRequest,
      zuoraRequester: Requests,
  )(querierRequest: REQ): ClientFailableOp[QuerierResponse] = {
    val aquaRequest = generateQuery(querierRequest)
    val aquaResponse = zuoraRequester.post[AquaQueryRequest, AquaJobResponse](aquaRequest, "batch-query/")
    toQuerierResponse(aquaResponse, querierRequest.dryRun)
  }

  def lowLevel(
      zuoraRequester: Requests,
  )(aquaRequest: AquaQueryRequest): ClientFailableOp[String] =
    zuoraRequester.post[AquaQueryRequest, AquaJobResponse](aquaRequest, "batch-query/") match {
      case ClientSuccess(AquaJobResponse(status, name, _, Some(jobId))) if status.toLowerCase == "submitted" =>
        ClientSuccess(jobId)
      case ClientSuccess(zuoraResponse) => GenericError(s"unexpected response from zuora: $zuoraResponse")
      case error: ClientFailure => error
    }

  def toQuerierResponse(
      aquaResponse: ClientFailableOp[AquaJobResponse],
      dryRun: Boolean,
  ): ClientFailableOp[QuerierResponse] = {
    aquaResponse match {
      case ClientSuccess(AquaJobResponse(status, name, _, Some(jobId))) if status.toLowerCase == "submitted" =>
        ClientSuccess(QuerierResponse(name, jobId, dryRun))
      case ClientSuccess(zuoraResponse) => GenericError(s"unexpected response from zuora: $zuoraResponse")
      case error: ClientFailure => error
    }
  }
}

case class QuerierResponse(name: String, jobId: String, dryRun: Boolean)

object QuerierResponse {
  implicit val writes = Json.writes[QuerierResponse]
}
