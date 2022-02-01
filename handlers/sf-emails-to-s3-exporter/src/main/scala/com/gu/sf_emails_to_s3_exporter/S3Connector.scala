package com.gu.sf_emails_to_s3_exporter

import java.nio.charset.StandardCharsets

import com.gu.effects.{AwsS3, Key, UploadToS3}
import com.gu.sf_emails_to_s3_exporter.Handler.safely
import com.typesafe.scalalogging.LazyLogging
import io.circe.generic.auto._
import io.circe.parser._
import io.circe.syntax._
import software.amazon.awssdk.core.ResponseInputStream
import software.amazon.awssdk.core.sync.RequestBody
import software.amazon.awssdk.services.s3.model._

import scala.io.Source
import scala.jdk.CollectionConverters.CollectionHasAsScala
import scala.util.{Failure, Success, Try}

object S3Connector extends LazyLogging {

  def saveEmailToS3(caseEmail: EmailsFromSfResponse.Records, bucketName: String): Either[CustomFailure, String] = {

    fileAlreadyExistsInS3(caseEmail.Parent.CaseNumber, bucketName) match {

      case Left(ex) => { Left(ex) }

      case Right(false) => {
        logger.info(s"${caseEmail.Parent.CaseNumber} does not already exist in S3")

        writeEmailsJsonToS3(
          caseEmail.Parent.CaseNumber,
          Seq[EmailsFromSfResponse.Records](caseEmail).asJson.toString(),
          caseEmail.Id,
          bucketName
        )
      }

      case Right(true) => {
        logger.info(s"${caseEmail.Parent.CaseNumber} already exists in S3")

        emailsInS3File(caseEmail, bucketName) match {
          case Left(ex) => { Left(CustomFailure(ex.message)) }
          case Right(emails) =>
            writeEmailsJsonToS3(
              caseEmail.Parent.CaseNumber,
              generateJsonForExistingFile(
                emails,
                caseEmail,
                emails.exists(_.Composite_Key__c == caseEmail.Composite_Key__c)
              ),
              caseEmail.Id,
              bucketName
            )
        }
      }
    }
  }

  def fileAlreadyExistsInS3(fileName: String, bucketName: String): Either[CustomFailure, Boolean] = {
    logger.info(s"Checking if $fileName exists in S3...")

    safely({
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
    })
  }

  def emailsInS3File(caseEmail: EmailsFromSfResponse.Records, bucketName: String): Either[CustomFailure, Seq[EmailsFromSfResponse.Records]] = {
    logger.info(s"Retrieving emails from ${caseEmail.Parent.CaseNumber}... ")

    for {
      s3FileJsonBody <- getEmailsJsonFromS3File(caseEmail.Parent.CaseNumber, bucketName)
      decodedEmails <- decode[Seq[EmailsFromSfResponse.Records]](s3FileJsonBody)
        .left
        .map(CustomFailure.fromThrowable)
    } yield decodedEmails
  }

  def writeEmailsJsonToS3(fileName: String, caseEmailsJson: String, emailId: String, bucketName: String): Either[CustomFailure, String] = {

    val uploadResponse = for {
      putRequest <- generateS3PutRequest(bucketName, fileName)
      requestBody <- generatePutRequestBody(caseEmailsJson)
      uploadResult <- uploadFileToS3(putRequest, requestBody)
    } yield uploadResult

    uploadResponse match {
      case Left(ex) => { Left(ex) }
      case Right(value) => {
        value match {
          case Failure(ex) => { Left(CustomFailure.fromThrowable(ex)) }
          case Success(success) => {
            logger.info(s"$fileName successfully saved to S3")
            Right(emailId)
          }
        }
      }
    }
  }

  def getEmailsJsonFromS3File(fileName: String, bucketName: String): Either[CustomFailure, String] = for {
    inputStream <- getS3File(fileName, bucketName)
  } yield {
    Source.fromInputStream(inputStream).mkString
  }

  def getS3File(fileName: String, bucketName: String): Either[CustomFailure, ResponseInputStream[GetObjectResponse]] = {
    logger.info(s"Getting $fileName from S3")

    safely(
      AwsS3.client.getObject(
        GetObjectRequest.builder
          .bucket(bucketName)
          .key(fileName)
          .build()
      )
    )
  }

  def generatePutRequestBody(caseEmailsJson: String): Either[CustomFailure, RequestBody] = {
    logger.info(s"Generating PutRequestBody... ")

    safely(
      RequestBody.fromString(caseEmailsJson, StandardCharsets.UTF_8)
    )
  }

  def uploadFileToS3(putRequest: PutObjectRequest, requestBody: RequestBody): Either[CustomFailure, Try[PutObjectResponse]] = {
    logger.info(s"saving file (${putRequest.key()}) to S3... ")

    safely(
      UploadToS3.putObject(putRequest, requestBody)
    )
  }

  def generateS3PutRequest(bucketName: String, fileName: String): Either[CustomFailure, PutObjectRequest] = {
    logger.info(s"Generating PutRequest for ${fileName}... ")

    safely(
      PutObjectRequest
        .builder
        .bucket(bucketName)
        .key(fileName)
        .build()
    )
  }

  def generateJsonForExistingFile(
    emailsAlreadyInFile: Seq[EmailsFromSfResponse.Records],
    newEmail: EmailsFromSfResponse.Records,
    newEmailAlreadyExistsInFile: Boolean
  ): String = {
    logger.info(s"Generating json for ${newEmail.Composite_Key__c}... ")

    if (newEmailAlreadyExistsInFile) {
      (emailsAlreadyInFile.filter(_.Composite_Key__c != newEmail.Composite_Key__c) :+ newEmail).asJson.toString()
    } else {
      (emailsAlreadyInFile :+ newEmail).asJson.toString()
    }
  }
}
