package com.gu.zuora.reports

import com.gu.util.zuora.RestRequestMaker
import com.gu.util.zuora.RestRequestMaker.{ClientFailableOp, GenericError, Requests}
import com.gu.zuora.reports.aqua.ZuoraAquaResponse
import play.api.libs.json._
import scalaz.{-\/, \/-}

object GetJobResult {
  def apply(zuoraRequester: Requests, JobResultRequest: JobResultRequest): ClientFailableOp[JobResultResponse] = {
    val zuoraAquaResponse = zuoraRequester.get[ZuoraAquaResponse](s"batch-query/jobs/${JobResultRequest.jobId}")
    toJobResultResponse(zuoraAquaResponse)
  }

  def toBatch(aquaBatch: aqua.Batch): Option[Batch] = aquaBatch.fileId.map {
    fileId => Batch(name = aquaBatch.name, fileId = fileId)
  }

  def toJobResultResponse(aquaResponse: ClientFailableOp[ZuoraAquaResponse]): ClientFailableOp[JobResultResponse] = {
    aquaResponse match {
      case \/-(ZuoraAquaResponse(status, name, _, _, aquaBatches, _)) if (status.isCompleted) =>
        val batches = aquaBatches.map(toBatch)
        if (batches.contains(None)) {
          -\/(RestRequestMaker.GenericError(s"file Id missing from response : $aquaResponse"))
        } else {
          \/-(Completed(name, batches.flatten))
        }

      case \/-(ZuoraAquaResponse(status, _, _, _, _, _)) if (status.isPending) => \/-(Pending)
      case \/-(zuoraResponse) => -\/(GenericError(s"unexpected status in zuora response: $zuoraResponse"))
      case -\/(error) => -\/(error)
    }
  }

  implicit class StringStatusOps(s: String) {
    def isCompleted = s.equalsIgnoreCase("completed")

    def isPending = List("pending", "executing").exists(_.equalsIgnoreCase(s))

    def isFailure = !isCompleted && !isPending
  }

}

case class JobResultRequest(jobId: String)

object JobResultRequest {
  implicit val reads = Json.reads[JobResultRequest]
}

sealed trait JobResultResponse

object JobResultResponse {
  implicit val writes = new Writes[JobResultResponse] {
    override def writes(jobResult: JobResultResponse): JsValue = jobResult match {
      case Pending => JsString("Pending")
      case c: Completed => Completed.writes.writes(c)
    }
  }
}

object Pending extends JobResultResponse

case class Batch(fileId: String, name: String)

object Batch {
  implicit val writes = Json.writes[Batch]
}

case class Completed(name: String, batches: Seq[Batch]) extends JobResultResponse

object Completed {
  val writes = Json.writes[Completed]
}
