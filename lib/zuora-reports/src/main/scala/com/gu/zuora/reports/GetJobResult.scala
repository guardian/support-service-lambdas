package com.gu.zuora.reports

import com.gu.util.zuora.RestRequestMaker
import com.gu.util.zuora.RestRequestMaker.{ClientFailableOp, GenericError, Requests}
import com.gu.zuora.reports.aqua.AquaJobResponse
import com.gu.zuora.reports.dataModel.Batch
import play.api.libs.json._
import scalaz.{-\/, \/-}

object GetJobResult {
  def apply(zuoraRequester: Requests)(jobResultRequest: JobResultRequest): ClientFailableOp[JobResult] = {
    val zuoraAquaResponse = zuoraRequester.get[AquaJobResponse](s"batch-query/jobs/${jobResultRequest.jobId}")
    toJobResultResponse(zuoraAquaResponse, jobResultRequest.dryRun, jobResultRequest.jobId)
  }

  def toBatch(aquaBatch: aqua.Batch): Option[Batch] = aquaBatch.fileId.map {
    fileId => Batch(name = aquaBatch.name, fileId = fileId)
  }

  def toJobResultResponse(aquaResponse: ClientFailableOp[AquaJobResponse], dryRun: Boolean, jobId: String): ClientFailableOp[JobResult] = {
    aquaResponse match {
      case \/-(AquaJobResponse(status, name, aquaBatches, _)) if status == "completed" =>
        val batches = aquaBatches.map(toBatch)
        if (batches.contains(None)) {
          -\/(RestRequestMaker.GenericError(s"file Id missing from response : $aquaResponse"))
        } else {
          \/-(Completed(name, jobId, batches.flatten, dryRun))
        }

      case \/-(AquaJobResponse(status, name, _, _)) if pendingValues.contains(status) => \/-(Pending(name, jobId, dryRun))
      case \/-(zuoraResponse) => -\/(GenericError(s"unexpected status in zuora response: $zuoraResponse"))
      case -\/(error) => -\/(error)
    }
  }

  val pendingValues = List("pending", "executing")
}

case class JobResultRequest(jobId: String, dryRun: Boolean)

object JobResultRequest {
  implicit val reads = Json.reads[JobResultRequest]
}

sealed trait JobResult {
  def name: String
  def jobId: String
  def dryRun: Boolean
}

case class Completed(name: String, jobId: String, batches: Seq[Batch], dryRun: Boolean) extends JobResult

case class Pending(name: String, jobId: String, dryRun: Boolean) extends JobResult

case class JobResultWire(
  name: String,
  jobId: String,
  status: String,
  batches: Option[Seq[Batch]],
  dryRun: Boolean
)

object JobResultWire {
  implicit val writes = Json.writes[JobResultWire]

  def fromJobResult(jobResult: JobResult) = jobResult match {
    case Completed(name, jobId, batches, dryRun) => JobResultWire(name, jobId, "completed", Some(batches), dryRun)
    case Pending(name, jobId, dryRun) => JobResultWire(name, jobId, "pending", None, dryRun)
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

