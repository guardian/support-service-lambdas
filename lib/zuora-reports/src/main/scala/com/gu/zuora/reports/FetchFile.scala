package com.gu.zuora.reports

import com.gu.util.zuora.RestRequestMaker.{ClientFailableOp, DownloadStream, Requests}
import play.api.libs.json._

object FetchFile {
  def apply(
    upload: (DownloadStream, String) => ClientFailableOp[String],
    getDownloadStream: (String) => ClientFailableOp[DownloadStream]
  )(fetchFileRequest: FetchFileRequest): ClientFailableOp[FetchFileResponse] = {
    val fileInfo = fetchFileRequest.batches.head
    val alreadyFetched = fetchFileRequest.fetched
    for {
      downloadStream <- getDownloadStream(s"batch-query/file/${fileInfo.fileId}")
      uploadPath <- upload(downloadStream, fileInfo.name)
    } yield {
      val fetched = FetchedFileInfo(fileInfo.fileId, uploadPath)
      val remaining = fetchFileRequest.batches.tail
      FetchFileResponse(fetched :: alreadyFetched, remaining, remaining.isEmpty)
    }
  }
}

case class FileInfo(fileId: String, name: String)

case class FetchedFileInfo(fileId: String, uri: String)

case class FetchFileRequest(fetched: List[FetchedFileInfo] = List.empty, batches: List[FileInfo])

case class FetchFileResponse(fetched: List[FetchedFileInfo], batches: List[FileInfo], done: Boolean)

object FileInfo {
  implicit val reads = Json.reads[FileInfo]
  implicit val writes = Json.writes[FileInfo]
}

object FetchedFileInfo {
  implicit val reads = Json.reads[FetchedFileInfo]
  implicit val writes = Json.writes[FetchedFileInfo]
}

object FetchFileRequest {
  implicit val reads = Json.using[Json.WithDefaultValues].reads[FetchFileRequest]
}

object FetchFileResponse {
  implicit val writes = Json.writes[FetchFileResponse]
}
