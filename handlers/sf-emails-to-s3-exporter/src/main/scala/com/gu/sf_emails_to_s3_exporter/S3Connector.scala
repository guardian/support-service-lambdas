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
import scala.util.{Failure, Success, Try}

object S3Connector extends LazyLogging {

  val bucketName = "emails-from-sf"

  def saveEmailToS3(caseEmail: EmailsFromSfResponse.Records): Either[CustomFailure, Option[String]] = {

    for {
      fileIsInS3 <- fileAlreadyExistsInS3(caseEmail.Parent.CaseNumber)
    } yield {
      if (fileIsInS3)
        updateS3FileIfEmailDoesNotExist(caseEmail)
      else {
        writeEmailsJsonToS3(
          caseEmail.Parent.CaseNumber,
          Seq[EmailsFromSfResponse.Records](caseEmail).asJson.toString(),
          caseEmail.Id
        )
        Some(caseEmail.Id)
      }
    }

  }

  def fileAlreadyExistsInS3(fileName: String): Either[CustomFailure, Boolean] = {

    Try {
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
    } match {
      case Failure(f) => { Left(CustomFailure.fromThrowable(f)) }
      case Success(s) => { Right(s) }
    }
  }

  def updateS3FileIfEmailDoesNotExist(caseEmail: EmailsFromSfResponse.Records): Option[String] = {
    println("updateS3FileIfEmailDoesNotExist...")
    val emailsInS3File = getEmailsInS3File(caseEmail)

    val emailAlreadyExistsInS3File = emailsInS3File
      .getOrElse(Seq[EmailsFromSfResponse.Records]())
      .exists(_.Composite_Key__c == caseEmail.Composite_Key__c)

    if (emailAlreadyExistsInS3File)
      None
    else {
      val caseEmailsToSaveToS3 = emailsInS3File.getOrElse(Seq[EmailsFromSfResponse.Records]()) :+ caseEmail
      val successfulEmailId = writeEmailsJsonToS3(caseEmail.Parent.CaseNumber, caseEmailsToSaveToS3.asJson.toString(), caseEmail.Id)
      //todo what happens if there is a failure writing to S3?
      Some(caseEmail.Id)
    }
  }

  def getEmailsInS3File(caseEmail: EmailsFromSfResponse.Records): Either[CustomFailure, Seq[EmailsFromSfResponse.Records]] = for {
    s3FileJsonBody <- getEmailsJsonFromS3File(bucketName, caseEmail.Parent.CaseNumber)
    decodedEmails <- decode[Seq[EmailsFromSfResponse.Records]](s3FileJsonBody)
      .left
      .map(CustomFailure.fromThrowable)
  } yield decodedEmails

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

  def getEmailsJsonFromS3File(bucketName: String, fileName: String): Either[CustomFailure, String] = {
    println("get file from S3.....")
    Try {
      val inputStream = AwsS3.client.getObject(
        GetObjectRequest.builder
          .bucket(bucketName)
          .key(fileName)
          .build()
      )
      Source.fromInputStream(inputStream).mkString
    } match {
      case Success(s) => {
        Right(s)
      }
      case Failure(ex) => {
        println("ABC")
        Left(CustomFailure(ex.getMessage))
      }
    }
  }

}
