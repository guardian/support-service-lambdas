package com.gu.zuora.reports

import com.amazonaws.services.s3.model.ObjectMetadata
import com.gu.effects.RawEffects
import com.gu.util.zuora.RestRequestMaker.{ClientFailableOp, GenericError, Requests}
import com.sun.net.httpserver.Authenticator.Failure
import play.api.libs.json._
import scalaz.{-\/, \/-}

import scala.util.{Failure, Success}

object FetchFile {
  def apply(zuoraRequester: Requests, fetchFileRequest: FetchFileRequest): ClientFailableOp[FetchFileResponse] = {
    val inputStream = zuoraRequester.download(s"batch-query/file/${fetchFileRequest.fileId}")
    //see how to make the s3 dependency reach here !! (PROBABLY ADD A SECOND ARGUMENT LIST AND APPLY IT BEFORE PASSING IT TO THE HANDLER)
    RawEffects.s3WriteStream(inputStream) match {
      case Success(()) => \/-(FetchFileResponse("some file", "somePath"))
      case Failure(ex) => -\/(GenericError(ex.getMessage))
    }
  }
}

case class FetchFileRequest(fileId: String)

case class FetchFileResponse(fileId: String, S3Path: String)

object FetchFileRequest {
  implicit val reads = Json.reads[FetchFileRequest]
}

object FetchFileResponse {
  implicit val writes = Json.writes[FetchFileResponse]
}
