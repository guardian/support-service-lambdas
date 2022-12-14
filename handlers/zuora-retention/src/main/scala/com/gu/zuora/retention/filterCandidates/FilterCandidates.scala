package com.gu.zuora.retention.filterCandidates

import java.io.{InputStream, OutputStream}

import com.amazonaws.services.lambda.runtime.Context
import com.gu.effects.RawEffects
import com.gu.util.apigateway.ApiGatewayHandler.LambdaIO
import com.gu.util.config.Stage
import com.gu.util.handlers.{JsonHandler, LambdaException}
import com.gu.zuora.reports.dataModel.FetchedFile
import com.gu.zuora.retention.query.ToAquaRequest
import com.gu.zuora.retention.Diff
import play.api.libs.json.Json

import scala.util.{Failure, Success, Try}

case class FilterCandidatesRequest(jobId: String, fetched: List[FetchedFile], dryRun: Boolean)

case class FilterCandidatesResponse(jobId: String, uri: String, dryRun: Boolean)

object FilterCandidatesRequest {
  implicit val reads = Json.reads[FilterCandidatesRequest]
}

object FilterCandidatesResponse {
  implicit val writes = Json.writes[FilterCandidatesResponse]
}

object FilterCandidates {

  val retentionBucketFor = Map(
    Stage("PROD") -> "zuora-retention-prod",
    Stage("CODE") -> "zuora-retention-code",
    Stage("DEV") -> "zuora-retention-dev",
  )

  // this is the entry point
  // it's referenced by the cloudformation so make sure you keep it in step
  def apply(inputStream: InputStream, outputStream: OutputStream, context: Context): Unit = {

    val wiredS3Upload = UploadToS3(RawEffects.s3Write, retentionBucketFor(RawEffects.stage)) _
    val wiredS3Iterator = S3Iterator(RawEffects.fetchContent) _
    val lambdaIO = new LambdaIO(inputStream, outputStream, context)
    val wiredOperation = operation(wiredS3Iterator, wiredS3Upload, Diff.apply _) _
    JsonHandler(lambdaIO, wiredOperation)
  }

  def getUri(files: List[FetchedFile], queryName: String) = {
    val queryResultUri = files.find(_.name == queryName).map(_.uri)
    queryResultUri
      .map(Success(_))
      .getOrElse(Failure(new LambdaException(s"could not find query result for $queryName")))
  }

  def operation(
      s3Iterator: String => Try[Iterator[String]],
      uploadToS3: (Iterator[String], String) => Try[String],
      diff: (Iterator[String], Iterator[String]) => Iterator[String],
  )(request: FilterCandidatesRequest) = for {
    exclusionsUri <- getUri(request.fetched, ToAquaRequest.exclusionQueryName)
    exclusionsIterator <- s3Iterator(exclusionsUri)
    candidatesUri <- getUri(request.fetched, ToAquaRequest.candidatesQueryName)
    candidatesIterator <- s3Iterator(candidatesUri)
    filteredCandidates = diff(candidatesIterator, exclusionsIterator)
    uploadKey = s"${request.jobId}/doNoProcess.csv"
    uploadUri <- uploadToS3(filteredCandidates, uploadKey)
    filterResponse = FilterCandidatesResponse(request.jobId, uploadUri, request.dryRun)
  } yield (filterResponse)
}
