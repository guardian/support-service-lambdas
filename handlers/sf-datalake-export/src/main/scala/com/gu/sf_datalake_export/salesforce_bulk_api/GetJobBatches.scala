package com.gu.sf_datalake_export.salesforce_bulk_api

import com.gu.sf_datalake_export.salesforce_bulk_api.CreateJob.JobId
import com.gu.util.resthttp.HttpOp.HttpOpWrapper
import com.gu.util.resthttp.JsonHttp.{GetMethod, StringHttpRequest}
import com.gu.util.resthttp.RestRequestMaker.{BodyAsString, RelativePath, UrlParams}
import com.gu.util.resthttp.Types.{ClientFailableOp, ClientFailure, ClientSuccess, GenericError}
import play.api.libs.json.{JsString, Json, Writes}

import scala.xml.Elem

object GetJobBatches {

  case class BatchId(value: String) extends AnyVal

  object BatchId {
    implicit val writes = Json.writes[BatchId]
  }

  sealed trait BatchState {
    def name: String
  }

  object BatchState {
    // https://developer.salesforce.com/docs/atlas.en-us.api_asynch.meta/api_asynch/asynch_api_batches_interpret_status.htm
    val allStates = List(Queued, InProgress, Completed, Failed, NotProcessed)
    val pendingStates = List(InProgress, Queued)
    // when pk chunking is enabled the original batch is not processed
    val doneStates = List(Completed, NotProcessed)
    implicit val writes: Writes[BatchState] = (state: BatchState) => JsString(state.name)

    def fromStringState(state: String): ClientFailableOp[BatchState] = allStates
      .find(_.name == state)
      .map {
        ClientSuccess(_)
      }
      .getOrElse(GenericError(s"unknown batch state: $state"))
  }

  object Queued extends BatchState {
    val name = "Queued"
  }

  object InProgress extends BatchState {
    val name = "InProgress"
  }

  object Completed extends BatchState {
    val name = "Completed"
  }

  object Failed extends BatchState {
    val name = "Failed"
  }

  object NotProcessed extends BatchState {
    val name = "NotProcessed"
  }

  case class BatchInfo(
      batchId: BatchId,
      state: BatchState,
  )

  object BatchInfo {
    implicit val writes = Json.writes[BatchInfo]
  }

  def parseBatches(xml: Elem): ClientFailableOp[Seq[BatchInfo]] = {
    val batchInfos = (xml \ "batchInfo")
    val failableBatchInfos = batchInfos.map { batchInfo =>
      val batchId = BatchId((batchInfo \ "id").text)
      val batchStateStr = (batchInfo \ "state").text
      val batchState = BatchState.fromStringState(batchStateStr)
      batchState.map(BatchInfo(batchId, _))
    }
    val failures = failableBatchInfos.collect { case error: ClientFailure => error }
    if (failures.nonEmpty) {
      GenericError("errors returned : " + failures.mkString(";"))
    } else {
      val successes = failableBatchInfos.collect { case ClientSuccess(batchInfo) => batchInfo }
      ClientSuccess(successes)
    }
  }

  def toRequest(jobId: JobId): StringHttpRequest = {
    val relativePath = RelativePath(s"/services/async/44.0/job/${jobId.value}/batch")
    StringHttpRequest(GetMethod, relativePath, UrlParams.empty)
  }

  def toResponse(bodyAsString: BodyAsString): ClientFailableOp[Seq[BatchInfo]] = {
    val xml: Elem = scala.xml.XML.loadString(bodyAsString.value)
    parseBatches(xml)
  }

  val wrapper = HttpOpWrapper[JobId, StringHttpRequest, BodyAsString, Seq[BatchInfo]](toRequest, toResponse)

}
