package com.gu.zuora.reports

import com.amazonaws.services.s3.model.{ObjectMetadata, PutObjectRequest, PutObjectResult}
import com.gu.util.zuora.RestRequestMaker.{ClientFailableOp, GenericError, Requests}
import play.api.libs.json._
import scalaz.{-\/, \/-}

import scala.util.{Failure, Success, Try}

object FetchFile {
  def apply(s3Write: PutObjectRequest => Try[PutObjectResult])(zuoraRequester: Requests, fetchFileRequest: FetchFileRequest): ClientFailableOp[FetchFileResponse] = {
    val downloadStream = zuoraRequester.download(s"batch-query/file/${fetchFileRequest.fileId}")
    val metadata = new ObjectMetadata()
    metadata.setContentLength(downloadStream.lengthBytes)
    val destBucket = "zuora-reports-code" // TODO refactor to generate this bucket name from the config
    val destKey = s"${fetchFileRequest.name}.csv" //todo do we want any type of directory structure to save the files ?
    val putObjectRequest = new PutObjectRequest(destBucket, fetchFileRequest.name, downloadStream.stream, metadata)
    s3Write(putObjectRequest) match {
      case Success(_) => \/-(FetchFileResponse(fetchFileRequest.fileId, s"$destBucket/$destKey"))
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
