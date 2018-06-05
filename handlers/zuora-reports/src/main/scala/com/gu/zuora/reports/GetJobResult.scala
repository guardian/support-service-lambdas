package com.gu.zuora.reports

import com.gu.util.zuora.RestRequestMaker
import com.gu.util.zuora.RestRequestMaker.{ClientFailableOp, GenericError, Requests}
import com.gu.zuora.reports.aqua.AquaJobResponse
import play.api.libs.json._
import scalaz.{-\/, \/-}

object GetJobResult {
  def apply(zuoraRequester: Requests)(jobResultRequest: JobResultRequest): ClientFailableOp[JobResult] = {
    val zuoraAquaResponse = zuoraRequester.get[AquaJobResponse](s"batch-query/jobs/${jobResultRequest.jobId}")
    toJobResultResponse(zuoraAquaResponse)
  }

  def toBatch(aquaBatch: aqua.Batch): Option[Batch] = aquaBatch.fileId.map {
    fileId => Batch(name = aquaBatch.name, fileId = fileId)
  }

  def toJobResultResponse(aquaResponse: ClientFailableOp[AquaJobResponse]): ClientFailableOp[JobResult] = {
    aquaResponse match {
      case \/-(AquaJobResponse(status, name, aquaBatches, _)) if status == "completed" =>
        val batches = aquaBatches.map(toBatch)
        if (batches.contains(None)) {
          -\/(RestRequestMaker.GenericError(s"file Id missing from response : $aquaResponse"))
        } else {
          \/-(Completed(name, batches.flatten))
        }

      case \/-(AquaJobResponse(status, _, _, _)) if pendingValues.contains(status) => \/-(Pending)
      case \/-(zuoraResponse) => -\/(GenericError(s"unexpected status in zuora response: $zuoraResponse"))
      case -\/(error) => -\/(error)
    }
  }

  val pendingValues = List("pending", "executing")
}

case class JobResultRequest(jobId: String)

object JobResultRequest {
  implicit val reads = Json.reads[JobResultRequest]
}

sealed trait JobResult

case class Completed(name: String, batches: Seq[Batch]) extends JobResult

object Pending extends JobResult

case class Batch(fileId: String, name: String)

object JobResult {
  implicit val writes = new Writes[JobResult] {
    override def writes(jobResult: JobResult): JsValue = jobResult match {
      case Pending => JsString("Pending")
      case c: Completed => Completed.writes.writes(c)
    }
  }
}

object Batch {
  implicit val writes = Json.writes[Batch]
}

object Completed {
  val writes = Json.writes[Completed]
}
