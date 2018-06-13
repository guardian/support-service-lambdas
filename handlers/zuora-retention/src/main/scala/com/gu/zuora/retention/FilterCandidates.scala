package com.gu.zuora.retention

import java.io.{ByteArrayInputStream, InputStream, OutputStream, OutputStreamWriter}

import com.amazonaws.services.lambda.runtime.Context
import com.amazonaws.services.s3.model._
import com.gu.effects.RawEffects

import com.gu.zuora.reports.S3ReportUpload.logger
import com.gu.zuora.reports.dataModel.FetchedFile
import com.gu.zuora.retention.query.ToAquaRequest
import play.api.libs.json.{Json, Reads, Writes}

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

//TODO DUPLICATED IN REPORTSLAMBDA
case class LambdaException(message: String) extends Exception(message)

object FilterCandidates {
  val crmIdColumnHeader = "Account.CrmId"
  def parseRequest[REQUEST](inputStream: InputStream)(implicit r: Reads[REQUEST]): Try[REQUEST] = {
    for {
      jsonString <- Try(Source.fromInputStream(inputStream).mkString)
      request <- Try(Json.parse(jsonString).as[REQUEST])
    } yield request
  }

  def serializeResponse[RESPONSE](outputStream: OutputStream, response: RESPONSE)(implicit w: Writes[RESPONSE]): Unit = {
    val writer = new OutputStreamWriter(outputStream, "UTF-8")
    val jsonResponse = Json.toJson(response)
    logger.info(s"Response will be: \n ${jsonResponse.toString}")
    writer.write(Json.stringify(jsonResponse))
    writer.close()
  }

  def apply(inputStream: InputStream, outputStream: OutputStream, context: Context): Unit = {
    val buckets = Map(
      "PROD" -> "zuora-retention-prod",
      "CODE" -> "zuora-retention-code",
      "DEV" -> "zuora-reports-dev"
    )
    val wiredGetInputStream = getInputStreamFor(RawEffects.fetchContent) _
    val wiredS3Upload = uploadToS3(RawEffects.s3Write, buckets(RawEffects.stage.value.toUpperCase), "doNotProcessList.csv") _
    runWithEffects(inputStream, wiredGetInputStream, wiredS3Upload)
  }

  def getInputStreamFor(fetchContent: GetObjectRequest => Try[S3ObjectInputStream])(files: List[FetchedFile], queryName: String) = {
    for {
      file <- files.find(_.name == queryName).map(Success(_)).getOrElse(Failure(new LambdaException(s"could not find query result for $queryName")))
      parsedUri = new java.net.URI(file.uri)
      path = parsedUri.getPath.stripPrefix("/")
      request = new GetObjectRequest(parsedUri.getHost, path)
      inputStream <- fetchContent(request)
    } yield inputStream
  }

  def filter(candidatesStream: InputStream, exclusions: Set[String]): Unit = {
    val source = Source.fromInputStream(candidatesStream)
    source.getLines()
  }

  def toExclusionsMap(exclusionsStream: InputStream) = {
    val source = Source.fromInputStream(exclusionsStream)
    val res = Try {
      source.getLines.toSeq.toSet
    }
    source.close()
    res
  }

  def filterCandidates(candidatesStream: InputStream, exclusions: Set[String]) = {
    val source = Source.fromInputStream(candidatesStream)
    val lines = source.getLines()
    val header = lines.next()
    val crmidLocation = header.split(",").indexOf(crmIdColumnHeader)

    def isExcluded(line: String) = {
      val crmId = line.split(",")(crmidLocation)
      exclusions.contains(crmId)
    }

    if (crmidLocation < 0) Failure(LambdaException(s"could not find column $crmIdColumnHeader in candidates query result")) else {
      Try(lines.filterNot(isExcluded))
    }
  }

  def uploadToS3(
    s3Write: PutObjectRequest => Try[PutObjectResult],
    bucket: String,
    key: String
  )(filteredCandidates: Iterator[String]) = {
    logger.info(s"uploading do do not process list to s3://$bucket/$key")
    val stringData = filteredCandidates.toList.mkString("\n")
    val data = stringData.getBytes("UTF-8")
    val stream = new ByteArrayInputStream(data)
    val metadata = new ObjectMetadata()
    metadata.setContentLength(data.length)

    val putObjectRequest = new PutObjectRequest(bucket, key, stream, metadata)
    s3Write(putObjectRequest)
  }

  def runWithEffects(
    inputStream: InputStream,
    getInputStreamFor: (List[FetchedFile], String) => Try[S3ObjectInputStream],
    uploadToS3: Iterator[String] => Try[PutObjectResult]
  ) = {

    val result = for {
      request <- parseRequest[FilterCandidatesRequest](inputStream)
      exclusionsStream <- getInputStreamFor(request.fetched, ToAquaRequest.exclusionQueryName)
      exclusions <- toExclusionsMap(exclusionsStream)
      candidatesStream <- getInputStreamFor(request.fetched, ToAquaRequest.candidatesQueryName)
      filteredCandidates <- filterCandidates(candidatesStream, exclusions)
      res <- uploadToS3(filteredCandidates)
    } yield res
    result match {
      case Success(_) => {
        logger.info("lambda finished successfully")
      }
      case Failure(ex) => {
        logger.error(("lambda finished unsuccessfully", ex))
        throw ex
      }
    }
  }

}

