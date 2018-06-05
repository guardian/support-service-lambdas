package com.gu.zuora.reports

import com.gu.util.zuora.RestRequestMaker.{ClientFailableOp, DownloadStream, GenericError, Requests}
import play.api.libs.json._

object FetchFile {
  def apply(
    uploader: (DownloadStream, String) => ClientFailableOp[String],
    zuoraRequester: Requests
  )(fetchFileRequest: FetchFileRequest): ClientFailableOp[FetchFileResponse] = {
    for {
      downloadStream <- zuoraRequester.getDownloadStream(s"batch-query/file/${fetchFileRequest.fileId}")
      uploadPath <- uploader(downloadStream, fetchFileRequest.name)
    } yield FetchFileResponse(fetchFileRequest.fileId, uploadPath)
  }
}

case class FetchFileRequest(fileId: String, name: String)

case class FetchFileResponse(fileId: String, S3Path: String)

object FetchFileRequest {
  implicit val reads = Json.reads[FetchFileRequest]
}

object FetchFileResponse {
  implicit val writes = Json.writes[FetchFileResponse]
}
