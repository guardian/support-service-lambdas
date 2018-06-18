package com.gu.zuora.retention

import java.io.{ByteArrayInputStream, InputStream, OutputStream}

import com.amazonaws.services.lambda.runtime.Context
import com.amazonaws.services.s3.model._
import com.gu.effects.RawEffects
import com.gu.util.apigateway.ApiGatewayHandler.LambdaIO
import com.gu.util.config.Stage
import com.gu.util.handlers.{LambdaException, ParseRequest, SerialiseResponse}
import com.gu.zuora.reports.S3ReportUpload.logger
import com.gu.zuora.reports.dataModel.FetchedFile
import com.gu.zuora.retention.query.ToAquaRequest
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
    Stage("DEV") -> "zuora-retention-dev"
  )

  // this is the entry point
  // it's referenced by the cloudformation so make sure you keep it in step
  def apply(inputStream: InputStream, outputStream: OutputStream, context: Context): Unit = {
    val wiredS3Upload = uploadToS3(RawEffects.s3Write, retentionBucketFor(RawEffects.stage), "doNotProcessList.csv") _
    val wiredS3Iterator = S3Iterator(RawEffects.fetchContent) _

    runWithEffects(
      lambdaIO = new LambdaIO(inputStream, outputStream, context),
      s3Iterator = wiredS3Iterator,
      uploadToS3 = wiredS3Upload,
      diff = Diff.apply
    )
  }

  def getUri(files: List[FetchedFile], queryName: String) = {
    val queryResultUri = files.find(_.name == queryName).map(_.uri)
    queryResultUri.map(Success(_)).getOrElse(Failure(new LambdaException(s"could not find query result for $queryName")))
  }

  def uploadToS3(
    s3Write: PutObjectRequest => Try[PutObjectResult],
    bucket: String,
    key: String
  )(filteredCandidates: Iterator[String]) = {
    val uploadLocation = s"s3://$bucket/$key"
    logger.info(s"uploading do do not process list to $uploadLocation")

    val stringData = filteredCandidates.toList.mkString("\n")
    val data = stringData.getBytes("UTF-8")
    val stream = new ByteArrayInputStream(data)

    val metadata = new ObjectMetadata()
    metadata.setContentLength(data.length)

    val putObjectRequest = new PutObjectRequest(bucket, key, stream, metadata)
    s3Write(putObjectRequest).map(_ => uploadLocation)
  }

  def runWithEffects(
    lambdaIO: LambdaIO,
    s3Iterator: String => Try[Iterator[String]],
    uploadToS3: Iterator[String] => Try[String],
    diff: (Iterator[String], Iterator[String]) => Iterator[String]
  ) = {
    val result = for {
      request <- ParseRequest[FilterCandidatesRequest](lambdaIO.inputStream)
      exclusionsUri <- getUri(request.fetched, ToAquaRequest.exclusionQueryName)
      exclusionsIterator <- s3Iterator(exclusionsUri)
      candidatesUri <- getUri(request.fetched, ToAquaRequest.candidatesQueryName)
      candidatesIterator <- s3Iterator(candidatesUri)
      filteredCandidates = diff(candidatesIterator, exclusionsIterator)
      putResult <- uploadToS3(filteredCandidates).map(uri => FilterCandidatesResponse(request.jobId, uri, request.dryRun))
    } yield (putResult)
    result match {
      case Success(filterCandidatesResponse) => {
        logger.info("lambda finished successfully")
        SerialiseResponse(lambdaIO.outputStream, filterCandidatesResponse)
      }
      case Failure(ex) => {
        logger.error(("lambda finished unsuccessfully", ex))
        throw ex
      }
    }
  }

}

