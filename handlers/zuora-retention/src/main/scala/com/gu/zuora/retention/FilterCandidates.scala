package com.gu.zuora.retention

import java.io.{ByteArrayInputStream, InputStream, OutputStream}

import com.amazonaws.services.lambda.runtime.Context
import com.amazonaws.services.s3.model._
import com.gu.effects.RawEffects
import com.gu.util.apigateway.ApiGatewayHandler.LambdaIO
import com.gu.util.handlers.{LambdaException, ParseRequest, SerialiseResponse}
import com.gu.zuora.reports.S3ReportUpload.logger
import com.gu.zuora.reports.dataModel.FetchedFile
import com.gu.zuora.retention.query.ToAquaRequest
import play.api.libs.json.Json

import scala.io.Source
import scala.util.{Failure, Success, Try}

case class FilterCandidatesRequest(fetched: List[FetchedFile] = List.empty)

case class FilterCandidatesResponse(uri: String)

object FilterCandidatesRequest {
  implicit val reads = Json.using[Json.WithDefaultValues].reads[FilterCandidatesRequest]
}

object FilterCandidatesResponse {
  implicit val writes = Json.writes[FilterCandidatesResponse]
}

object FilterCandidates {

  def apply(inputStream: InputStream, outputStream: OutputStream, context: Context): Unit = {
    val buckets = Map(
      "PROD" -> "zuora-retention-prod",
      "CODE" -> "zuora-retention-code",
      "DEV" -> "zuora-reports-dev"
    )

    val wiredS3Upload = uploadToS3(RawEffects.s3Write, buckets(RawEffects.stage.value.toUpperCase), "doNotProcessList.csv") _
    val lambdaIO = new LambdaIO(inputStream, outputStream, context)
    runWithEffects(lambdaIO, RawEffects.fetchContent, wiredS3Upload, Diff.apply)
  }

  def getUri(files: List[FetchedFile], queryName: String) = {
    val queryResultUri = files.find(_.name == queryName).map(_.uri)
    queryResultUri.map(Success(_)).getOrElse(Failure(new LambdaException(s"could not find query result for $queryName")))
  }

  def getInputStream(
    uri: String,
    fetchContent: GetObjectRequest => Try[S3ObjectInputStream]
  ) = {
    val parsedUri = new java.net.URI(uri)
    val path = parsedUri.getPath.stripPrefix("/")
    val request = new GetObjectRequest(parsedUri.getHost, path)
    fetchContent(request)
  }

  def uploadToS3(
    s3Write: PutObjectRequest => Try[PutObjectResult],
    bucket: String,
    key: String
  )(filteredCandidates: Iterator[String]) = {
    val uploadLocation = s"s3://$bucket/$key"
    logger.info(s"uploading do do not process list to $uploadLocation")

    //TODO IS THERE A WAY TO SAVE THIS WITHOUT PUTTING IT ALL IN MEMORY ?
    val stringData = filteredCandidates.toList.mkString("\n")
    val data = stringData.getBytes("UTF-8")
    val stream = new ByteArrayInputStream(data)

    val metadata = new ObjectMetadata()
    metadata.setContentLength(data.length)

    val putObjectRequest = new PutObjectRequest(bucket, key, stream, metadata)
    s3Write(putObjectRequest).map { _ =>
      uploadLocation
    }
  }

  def runWithEffects(
    lambdaIO: LambdaIO,
    fetchContent: GetObjectRequest => Try[S3ObjectInputStream],
    uploadToS3: Iterator[String] => Try[String],
    diff: (Iterator[String], Iterator[String]) => Iterator[String]
  ) = {
    val result = for {
      request <- ParseRequest[FilterCandidatesRequest](lambdaIO.inputStream)
      exclusionsUri <- getUri(request.fetched, ToAquaRequest.exclusionQueryName)
      exclusionsIterator <- getInputStream(exclusionsUri, fetchContent).map(Source.fromInputStream(_).getLines)
      candidatesUri <- getUri(request.fetched, ToAquaRequest.candidatesQueryName)
      candidatesIterator <- getInputStream(candidatesUri, fetchContent).map(Source.fromInputStream(_).getLines)
      filteredCandidates = diff(candidatesIterator, exclusionsIterator)
      putResult <- uploadToS3(filteredCandidates)
    } yield (putResult)
    result match {
      case Success(uploadUri) => {
        logger.info("lambda finished successfully")
        SerialiseResponse(lambdaIO.outputStream, FilterCandidatesResponse(uploadUri))
      }
      case Failure(ex) => {
        logger.error(("lambda finished unsuccessfully", ex))
        throw ex
      }
    }
  }

}

