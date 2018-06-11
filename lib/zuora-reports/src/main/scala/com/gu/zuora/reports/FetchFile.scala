package com.gu.zuora.reports

import com.gu.util.zuora.RestRequestMaker.{ClientFailableOp, DownloadStream, Requests}
import play.api.libs.json._

object FetchFile {
  def apply(
    upload: (DownloadStream, String) => ClientFailableOp[String],
    zuoraRequester: Requests
  )(fetchFileRequest: FetchFileRequest): ClientFailableOp[FetchFileResponse] = {
    val fileInfo = fetchFileRequest.batches.head
    for {
      downloadStream <- zuoraRequester.getDownloadStream(s"batch-query/file/${fileInfo.fileId}")
      uploadPath <- upload(downloadStream, fileInfo.name)
    } yield {
      val fetched = FetchedFileInfo(fileInfo.fileId, uploadPath)
      val remaining = fetchFileRequest.batches.tail
      FetchFileResponse(List(fetched), remaining, remaining.isEmpty)
    }
  }
}

case class FetchFileRequest(batches: Seq[FileInfo])

case class FileInfo(fileId: String, name: String)

case class FetchedFileInfo(fileId: String, uri: String)

case class FetchFileResponse(fetched: Seq[FetchedFileInfo], batches: Seq[FileInfo], done: Boolean)

object FileInfo {
  implicit val reads = Json.reads[FileInfo]
  implicit val writes = Json.writes[FileInfo]
}

object FetchFileRequest {
  implicit val reads = Json.reads[FetchFileRequest]
}

object FetchedFileInfo {
  implicit val writes = Json.writes[FetchedFileInfo]
}

object FetchFileResponse {
  implicit val writes = Json.writes[FetchFileResponse]
}
