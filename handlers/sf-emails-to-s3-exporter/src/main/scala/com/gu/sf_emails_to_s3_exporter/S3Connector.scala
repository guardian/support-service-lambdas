package com.gu.sf_emails_to_s3_exporter

import java.nio.charset.StandardCharsets

import com.gu.effects.{AwsS3, Key, UploadToS3}
import com.typesafe.scalalogging.LazyLogging
import software.amazon.awssdk.core.sync.RequestBody
import software.amazon.awssdk.services.s3.model.{GetObjectRequest, ListObjectsRequest, PutObjectRequest}

import scala.io.Source
import scala.jdk.CollectionConverters.CollectionHasAsScala

object S3Connector extends LazyLogging{

  val bucketName = "emails-from-sf"

  def writeEmailsJsonToS3(fileName: String, caseEmailsJson: String): Unit = {

    val putRequest = PutObjectRequest.builder
      .bucket(bucketName)
      .key(s"${fileName}")
      .build()

    val requestBody = RequestBody.fromString(caseEmailsJson, StandardCharsets.UTF_8)

    UploadToS3.putObject(putRequest, requestBody)
      .fold(
        ex => {
          logger.info(s"Upload failed due to $ex")
          Left(s"Upload failed due to $ex")
        },
        result => {
          logger.info(s"Successfully saved Case emails ($fileName) to S3")
          Right(result)
        }
      )
  }

  def fileExistsInS3(fileName: String): Boolean = {

    val filesInS3MatchingFileName = AwsS3.client.listObjects(
      ListObjectsRequest.builder
        .bucket("emails-from-sf")
        .prefix(fileName)
        .build()
    ).contents.asScala.toList

    filesInS3MatchingFileName
      .map(
        objSummary => Key(objSummary.key)
      ).contains(Key(fileName))
  }

  def getEmailsJsonFromS3File(bucketName: String, fileName: String): String = {
    val inputStream = AwsS3.client.getObject(
      GetObjectRequest.builder
        .bucket("emails-from-sf")
        .key(fileName + ".json")
        .build()
    )

    Source.fromInputStream(inputStream).mkString
  }
}