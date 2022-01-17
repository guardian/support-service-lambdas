package com.gu.sf_emails_to_s3_exporter

import java.nio.charset.StandardCharsets

import com.gu.effects.{AwsS3, Key, UploadToS3}
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

  val bucketName = "emails-from-sf"

  def generateJson(fileIsInS3: Boolean, caseEmail: EmailsFromSfResponse.Records): Either[CustomFailure, String] = {

    Right(if (fileIsInS3)
      generateJsonForS3FileIfEmailDoesNotExist(caseEmail)
    else {
      generateJsonForS3FileIfFileDoesNotExist(Seq[EmailsFromSfResponse.Records](caseEmail))
    })

  }

  def saveEmailToS3(caseEmail: EmailsFromSfResponse.Records): Either[CustomFailure, String] = {

    val fileExists = for {
      fileIsInS3 <- fileAlreadyExistsInS3(caseEmail.Parent.CaseNumber)
    } yield fileIsInS3

    fileExists match {
      case Left(ex) => {
        Left(CustomFailure(ex.message))
      }
      case Right(value) => {
        value match {
          case false => {
            val json = generateJsonForS3FileIfFileDoesNotExist(Seq[EmailsFromSfResponse.Records](caseEmail))
            writeEmailsJsonToS3(caseEmail.Parent.CaseNumber, json, caseEmail.Id)
          }

          case true => {
            val emailsInS3File = getEmailsInS3File(caseEmail)

            val emailAlreadyExistsInS3File = emailsInS3File
              .getOrElse(Seq[EmailsFromSfResponse.Records]())
              .exists(_.Composite_Key__c == caseEmail.Composite_Key__c)

            if (!emailAlreadyExistsInS3File) {
              val json = generateJsonForS3FileIfEmailDoesNotExist(caseEmail: EmailsFromSfResponse.Records)
              writeEmailsJsonToS3(caseEmail.Parent.CaseNumber, json, caseEmail.Id)
            } else {
              Right("")
            }
          }
        }
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
      case Failure(f) => {
        Left(CustomFailure.fromThrowable(f))
      }
      case Success(s) => {
        Right(s)
      }
    }
  }

  def getEmailsInS3File(caseEmail: EmailsFromSfResponse.Records): Either[CustomFailure, Seq[EmailsFromSfResponse.Records]] = for {
    s3FileJsonBody <- getEmailsJsonFromS3File(caseEmail.Parent.CaseNumber)
    decodedEmails <- decode[Seq[EmailsFromSfResponse.Records]](s3FileJsonBody)
      .left
      .map(CustomFailure.fromThrowable)
  } yield decodedEmails

  def writeEmailsJsonToS3(fileName: String, caseEmailsJson: String, emailId: String): Either[CustomFailure, String] = {

    val uploadResponse = for {
      putRequest <- generateS3PutRequest(bucketName, fileName)
      requestBody <- generatePutRequestBody(caseEmailsJson)
      uploadResult <- uploadFileToS3(putRequest, requestBody)
    } yield uploadResult

    uploadResponse match {
      case Left(ex) => { Left(CustomFailure(ex.message)) }
      case Right(value) => { Right(emailId) }
    }
  }

  def getEmailsJsonFromS3File(fileName: String): Either[CustomFailure, String] = {

    for {
      inputStream <- getS3File(fileName)
    } yield {
      Source.fromInputStream(inputStream).mkString
    }
  }

  def getS3File(fileName: String): Either[CustomFailure, ResponseInputStream[GetObjectResponse]] = Try(
    AwsS3.client.getObject(
      GetObjectRequest.builder
        .bucket(bucketName)
        .key(fileName)
        .build()
    )
  ) match {
      case Failure(ex) => { Left(CustomFailure(ex.getMessage)) }
      case Success(s) => { Right(s) }
    }

  def generatePutRequestBody(caseEmailsJson: String): Either[CustomFailure, RequestBody] = Try(
    RequestBody.fromString(caseEmailsJson, StandardCharsets.UTF_8)
  ) match {
      case Failure(ex) => { Left(CustomFailure(ex.getMessage)) }
      case Success(s) => { Right(s) }
    }

  def uploadFileToS3(putRequest: PutObjectRequest, requestBody: RequestBody): Either[CustomFailure, PutObjectResponse] =
    UploadToS3.putObject(putRequest, requestBody) match {
      case Failure(ex) => { Left(CustomFailure.fromThrowable(ex)) }
      case Success(s) => { Right(s) }
    }

  def generateS3PutRequest(bucketName: String, fileName: String): Either[CustomFailure, PutObjectRequest] = Try(
    PutObjectRequest
      .builder
      .bucket(bucketName)
      .key(s"${fileName}")
      .build()
  ) match {
      case Failure(ex) => { Left(CustomFailure(ex.getMessage)) }
      case Success(s) => { Right(s) }
    }

  def generateJsonForS3FileIfEmailDoesNotExist(caseEmail: EmailsFromSfResponse.Records): String = {
    val emailsInS3File = getEmailsInS3File(caseEmail)

    val emailAlreadyExistsInS3File = emailsInS3File
      .getOrElse(Seq[EmailsFromSfResponse.Records]())
      .exists(_.Composite_Key__c == caseEmail.Composite_Key__c)

    if (emailAlreadyExistsInS3File)
      ""
    else {
      (emailsInS3File.getOrElse(Seq[EmailsFromSfResponse.Records]()) :+ caseEmail).asJson.toString()
    }
  }

  def generateJsonForS3FileIfFileDoesNotExist(caseEmailsToSaveToS3: Seq[EmailsFromSfResponse.Records]): String = {
    caseEmailsToSaveToS3.asJson.toString()
  }
}
