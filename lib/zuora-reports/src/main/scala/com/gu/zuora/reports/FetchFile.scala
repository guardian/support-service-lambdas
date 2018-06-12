package com.gu.zuora.reports

import com.gu.util.zuora.RestRequestMaker.{ClientFailableOp, DownloadStream, Requests}
import com.gu.zuora.reports.dataModel.{Batch, FetchedFile}
import play.api.libs.json._

object FetchFile {
  def apply(
    upload: (DownloadStream, String) => ClientFailableOp[String],
    getDownloadStream: (String) => ClientFailableOp[DownloadStream]
  )(fetchFileRequest: FetchFileRequest): ClientFailableOp[FetchFileResponse] = {
    val fileInfo = fetchFileRequest.batches.head
    val fileName = fileInfo.name + ".csv"
    val alreadyFetched = fetchFileRequest.fetched
    for {
      downloadStream <- getDownloadStream(s"batch-query/file/$fileName")
      uploadPath <- upload(downloadStream, fileName)
    } yield {
      val fetched = FetchedFile(fileInfo.fileId, fileInfo.name, uploadPath)
      val remaining = fetchFileRequest.batches.tail
      FetchFileResponse(fetched :: alreadyFetched, remaining, remaining.isEmpty)
    }
  }
}

case class FetchFileRequest(fetched: List[FetchedFile] = List.empty, batches: List[Batch])

case class FetchFileResponse(fetched: List[FetchedFile], batches: List[Batch], done: Boolean)

object FetchFileRequest {
  implicit val reads = Json.using[Json.WithDefaultValues].reads[FetchFileRequest]
}

object FetchFileResponse {
  implicit val writes = Json.writes[FetchFileResponse]
}
