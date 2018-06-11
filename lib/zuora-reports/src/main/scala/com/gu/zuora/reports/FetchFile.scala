package com.gu.zuora.reports

import com.gu.util.zuora.RestRequestMaker.{ClientFailableOp, DownloadStream, Requests}
import play.api.libs.json._

object FetchFile {
  def apply(
    upload: (DownloadStream, String) => ClientFailableOp[String],
    zuoraRequester: Requests
  )(fetchFileRequest: FetchFileRequest): ClientFailableOp[FetchFileResponse] = {
    for {
      downloadStream <- zuoraRequester.getDownloadStream(s"batch-query/file/${fetchFileRequest.fileId}")
      uploadPath <- upload(downloadStream, fetchFileRequest.saveLocation)
    } yield FetchFileResponse(fetchFileRequest.fileId, uploadPath)
  }
}

case class FetchFileRequest(fileId: String, saveLocation: String)

case class FetchFileResponse(fileId: String, uri: String)

object FetchFileRequest {
  implicit val reads = Json.reads[FetchFileRequest]
}

object FetchFileResponse {
  implicit val writes = Json.writes[FetchFileResponse]
}
