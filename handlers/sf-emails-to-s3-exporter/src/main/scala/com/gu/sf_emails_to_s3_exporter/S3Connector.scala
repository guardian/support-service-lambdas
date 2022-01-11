package com.gu.sf_emails_to_s3_exporter

import java.nio.charset.StandardCharsets

import com.gu.effects.{AwsS3, Key, UploadToS3}
import com.typesafe.scalalogging.LazyLogging
import io.circe.generic.auto._
import io.circe.parser._
import io.circe.syntax._
import software.amazon.awssdk.core.sync.RequestBody
import software.amazon.awssdk.services.s3.model.{GetObjectRequest, ListObjectsRequest, PutObjectRequest}

import scala.io.Source
import scala.jdk.CollectionConverters.CollectionHasAsScala

object S3Connector extends LazyLogging {

  val bucketName = "emails-from-sf"

  def saveEmailToS3(caseEmail: EmailsFromSfResponse.Records): String = {
    val fileExistsInS3 = fileAlreadyExistsInS3(caseEmail.Parent.CaseNumber)

    fileExistsInS3 match {

      //Append
      case true => {
        updateS3FileIfEmailDoesNotExist(caseEmail)
      }

      //Create
      case false => {
        val successfulEmailId = writeEmailsJsonToS3(
          caseEmail.Parent.CaseNumber,
          Seq[EmailsFromSfResponse.Records](caseEmail).asJson.toString(),
          caseEmail.Id
        )
        caseEmail.Id
      }
    }
  }

  def fileAlreadyExistsInS3(fileName: String): Boolean = {

    val filesInS3MatchingFileName = AwsS3.client.listObjects(
      ListObjectsRequest.builder
        .bucket(bucketName)
        .prefix(fileName)
        .build()
    ).contents.asScala.toList

    filesInS3MatchingFileName
      .map(
        objSummary => Key(objSummary.key)
      ).contains(Key(fileName))
  }

  def updateS3FileIfEmailDoesNotExist(caseEmail: EmailsFromSfResponse.Records): String = {

    val s3FileJsonBody = getEmailsJsonFromS3File(bucketName, caseEmail.Parent.CaseNumber)
    val decodedCaseEmailsFromS3 = decode[Seq[EmailsFromSfResponse.Records]](s3FileJsonBody)
    val emailsInS3File = decodedCaseEmailsFromS3.getOrElse(Seq[EmailsFromSfResponse.Records]())

    val emailAlreadyExistsInS3File = emailsInS3File.exists(s3Email =>
      s3Email.Composite_Key__c == caseEmail.Composite_Key__c)

    emailAlreadyExistsInS3File match {
      case true => {
        //do nothing
        ""
      }
      case false => {
        val caseEmailsToSaveToS3 = emailsInS3File :+ caseEmail
        val successfulEmailId = writeEmailsJsonToS3(caseEmail.Parent.CaseNumber, caseEmailsToSaveToS3.asJson.toString(), caseEmail.Id)
        caseEmail.Id
      }
    }
  }

  def writeEmailsJsonToS3(fileName: String, caseEmailsJson: String, emailId: String): Either[Throwable, String] = {

    val putRequest = PutObjectRequest.builder
      .bucket(bucketName)
      .key(s"${fileName}")
      .build()

    val requestBody = RequestBody.fromString(caseEmailsJson, StandardCharsets.UTF_8)

    UploadToS3.putObject(putRequest, requestBody)
      .fold(
        ex => {
          logger.info(s"Upload failed due to $ex")
          Left(ex)
        },
        result => {
          println("result:" + result)
          logger.info(s"Successfully saved Case emails ($fileName) to S3")

          Right(emailId)
        }
      )
  }

  def getEmailsJsonFromS3File(bucketName: String, fileName: String): String = {
    val inputStream = AwsS3.client.getObject(
      GetObjectRequest.builder
        .bucket(bucketName)
        .key(fileName)
        .build()
    )
    Source.fromInputStream(inputStream).mkString
  }

}
