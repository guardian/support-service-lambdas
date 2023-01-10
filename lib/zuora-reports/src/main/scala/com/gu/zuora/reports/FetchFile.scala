package com.gu.zuora.reports

import com.gu.util.resthttp.RestRequestMaker.DownloadStream
import com.gu.util.resthttp.Types.ClientFailableOp
import com.gu.zuora.reports.dataModel.{Batch, FetchedFile}
import play.api.libs.json._

object FetchFile {
  def apply(
      upload: (DownloadStream, String) => ClientFailableOp[String],
      getDownloadStream: (String) => ClientFailableOp[DownloadStream],
  )(fetchFileRequest: FetchFileRequest): ClientFailableOp[FetchFileResponse] = {
    val fileInfo = fetchFileRequest.batches.head
    val key = s"${fetchFileRequest.jobId}/${fileInfo.name}.csv"
    val alreadyFetched = fetchFileRequest.fetched
    for {
      downloadStream <- getDownloadStream(s"batch-query/file/${fileInfo.fileId}")
      uploadPath <- upload(downloadStream, key)
    } yield {
      val fetched = FetchedFile(fileInfo.fileId, fileInfo.name, uploadPath)
      val remaining = fetchFileRequest.batches.tail
      FetchFileResponse(
        fetchFileRequest.jobId,
        fetched :: alreadyFetched,
        remaining,
        remaining.isEmpty,
        fetchFileRequest.dryRun,
      )
    }
  }
}

case class FetchFileRequest(
    jobId: String,
    fetched: List[FetchedFile] = List.empty,
    batches: List[Batch],
    dryRun: Boolean,
)

case class FetchFileResponse(
    jobId: String,
    fetched: List[FetchedFile],
    batches: List[Batch],
    done: Boolean,
    dryRun: Boolean,
)

object FetchFileRequest {
  implicit val reads = Json.using[Json.WithDefaultValues].reads[FetchFileRequest]
}

object FetchFileResponse {
  implicit val writes = Json.writes[FetchFileResponse]
}
