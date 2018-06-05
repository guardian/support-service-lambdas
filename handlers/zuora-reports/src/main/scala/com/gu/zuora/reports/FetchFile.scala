package com.gu.zuora.reports

import com.gu.util.zuora.RestRequestMaker.{ClientFailableOp, DownloadStream, GenericError, Requests}
import play.api.libs.json._
import scalaz.{-\/, \/-}

import scala.util.{Failure, Success, Try}

object FetchFile {
  def apply(
    uploader: (DownloadStream, String) => Try[String],
    zuoraRequester: Requests
  )(fetchFileRequest: FetchFileRequest): ClientFailableOp[FetchFileResponse] = {
    val downloadStream = zuoraRequester.download(s"batch-query/file/${fetchFileRequest.fileId}")
    uploader(downloadStream, fetchFileRequest.name) match {
      case Success(path) => \/-(FetchFileResponse(fetchFileRequest.fileId, path))
      case Failure(ex) => -\/(GenericError(ex.getMessage))
    }
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
