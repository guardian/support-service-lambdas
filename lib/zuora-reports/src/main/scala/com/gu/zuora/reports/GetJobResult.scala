package com.gu.zuora.reports

import com.gu.util.resthttp.RestRequestMaker.{RequestsGet, WithCheck}
import com.gu.util.resthttp.Types.{ClientFailableOp, ClientFailure, ClientSuccess, GenericError}
import com.gu.zuora.reports.aqua.AquaJobResponse
import com.gu.zuora.reports.dataModel.Batch
import play.api.libs.json._

object GetJobResult {
  val MAX_TRIES = 10
  def apply(aquaGet: RequestsGet[AquaJobResponse])(jobResultRequest: JobResultRequest): ClientFailableOp[JobResult] = {
    val zuoraAquaResponse = aquaGet(s"batch-query/jobs/${jobResultRequest.jobId}", WithCheck)
    val tries = jobResultRequest.tries.getOrElse(MAX_TRIES)
    if (tries > 0)
      toJobResultResponse(zuoraAquaResponse, jobResultRequest.dryRun, jobResultRequest.jobId, tries - 1)
    else
      GenericError("tries must be > 0")
  }

  def toBatch(aquaBatch: aqua.Batch): Option[Batch] = aquaBatch.fileId.map { fileId =>
    Batch(name = aquaBatch.name, fileId = fileId)
  }

  def toJobResultResponse(
      aquaResponse: ClientFailableOp[AquaJobResponse],
      dryRun: Boolean,
      jobId: String,
      tries: Int,
  ): ClientFailableOp[JobResult] = {
    aquaResponse match {
      case ClientSuccess(AquaJobResponse(status, name, aquaBatches, _)) if status == "completed" =>
        val batches = aquaBatches.map(toBatch)
        if (batches.contains(None)) {
          GenericError(s"file Id missing from response : $aquaResponse")
        } else {
          ClientSuccess(Completed(name, jobId, batches.flatten, dryRun, tries))
        }

      case ClientSuccess(AquaJobResponse(status, name, _, _)) if pendingValues.contains(status) =>
        ClientSuccess(Pending(name, jobId, dryRun, tries))
      case ClientSuccess(zuoraResponse) => (GenericError(s"unexpected status in zuora response: $zuoraResponse"))
      case error: ClientFailure => error
    }
  }

  val pendingValues = List(
    "submitted",
    "pending",
    "executing",
  ) // https://knowledgecenter.zuora.com/Central_Platform/API/AB_Aggregate_Query_API/C_Get_Job_ID
}

case class JobResultRequest(jobId: String, dryRun: Boolean, tries: Option[Int])

object JobResultRequest {
  implicit val reads = Json.reads[JobResultRequest]
}

sealed trait JobResult {
  def name: String
  def jobId: String
  def dryRun: Boolean
  def tries: Int
}

case class Completed(name: String, jobId: String, batches: Seq[Batch], dryRun: Boolean, tries: Int) extends JobResult

object Completed {
  implicit val writes: Writes[Completed] = result => {
    val wireResult = JobResultWire.fromJobResult(result)
    JobResultWire.writes.writes(wireResult)
  }
}

case class Pending(name: String, jobId: String, dryRun: Boolean, tries: Int) extends JobResult

object Pending {
  implicit val writes: Writes[Pending] = result => {
    val wireResult = JobResultWire.fromJobResult(result)
    JobResultWire.writes.writes(wireResult)
  }
}

case class JobResultWire(
    name: String,
    jobId: String,
    status: String,
    batches: Option[Seq[Batch]],
    dryRun: Boolean,
    tries: Int,
)

object JobResultWire {
  implicit val writes = Json.writes[JobResultWire]

  def fromJobResult(jobResult: JobResult) = jobResult match {
    case Completed(name, jobId, batches, dryRun, tries) =>
      JobResultWire(name, jobId, "completed", Some(batches), dryRun, tries)
    case Pending(name, jobId, dryRun, tries) => JobResultWire(name, jobId, "pending", None, dryRun, tries)
  }
}

object JobResult {
  implicit val writes = new Writes[JobResult] {
    override def writes(result: JobResult): JsValue = {
      val wireResult = JobResultWire.fromJobResult(result)
      JobResultWire.writes.writes(wireResult)
    }
  }
}
