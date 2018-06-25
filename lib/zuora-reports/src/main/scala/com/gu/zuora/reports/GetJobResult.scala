package com.gu.zuora.reports

import com.gu.util.zuora.RestRequestMaker
import com.gu.util.zuora.RestRequestMaker.{ClientFailableOp, GenericError}
import com.gu.zuora.reports.aqua.AquaJobResponse
import com.gu.zuora.reports.dataModel.Batch
import play.api.libs.json._
import scalaz.{-\/, \/-}

object GetJobResult {
  val MAX_TRIES = 10
  def apply(aquaGet: String => ClientFailableOp[AquaJobResponse])(jobResultRequest: JobResultRequest): ClientFailableOp[JobResult] = {
    val zuoraAquaResponse = aquaGet(s"batch-query/jobs/${jobResultRequest.jobId}")
    val retries = jobResultRequest.tries.getOrElse(MAX_TRIES)
    if (retries > 0)
      toJobResultResponse(zuoraAquaResponse, jobResultRequest.dryRun, jobResultRequest.jobId, retries - 1)
    else
      -\/(GenericError("tries must be > 0"))
  }

  def toBatch(aquaBatch: aqua.Batch): Option[Batch] = aquaBatch.fileId.map {
    fileId => Batch(name = aquaBatch.name, fileId = fileId)
  }

  def toJobResultResponse(aquaResponse: ClientFailableOp[AquaJobResponse], dryRun: Boolean, jobId: String, retries: Int): ClientFailableOp[JobResult] = {
    aquaResponse match {
      case \/-(AquaJobResponse(status, name, aquaBatches, _)) if status == "completed" =>
        val batches = aquaBatches.map(toBatch)
        if (batches.contains(None)) {
          -\/(RestRequestMaker.GenericError(s"file Id missing from response : $aquaResponse"))
        } else {
          \/-(Completed(name, jobId, batches.flatten, dryRun, retries))
        }

      case \/-(AquaJobResponse(status, name, _, _)) if pendingValues.contains(status) => \/-(Pending(name, jobId, dryRun, retries))
      case \/-(zuoraResponse) => -\/(GenericError(s"unexpected status in zuora response: $zuoraResponse"))
      case -\/(error) => -\/(error)
    }
  }

  val pendingValues = List("pending", "executing")
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

case class Pending(name: String, jobId: String, dryRun: Boolean, tries: Int) extends JobResult

case class JobResultWire(
  name: String,
  jobId: String,
  status: String,
  batches: Option[Seq[Batch]],
  dryRun: Boolean,
  retries: Int
)

object JobResultWire {
  implicit val writes = Json.writes[JobResultWire]

  def fromJobResult(jobResult: JobResult) = jobResult match {
    case Completed(name, jobId, batches, dryRun, retries) => JobResultWire(name, jobId, "completed", Some(batches), dryRun, retries)
    case Pending(name, jobId, dryRun, retries) => JobResultWire(name, jobId, "pending", None, dryRun, retries)
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

