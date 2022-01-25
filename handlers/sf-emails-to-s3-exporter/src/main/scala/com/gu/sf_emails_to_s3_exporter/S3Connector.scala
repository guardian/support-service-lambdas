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
import scala.util.Try

object S3Connector extends LazyLogging {

  def saveEmailToS3(caseEmail: EmailsFromSfResponse.Records, bucketName: String): Either[CustomFailure, Option[String]] = {

    val fileExists = fileAlreadyExistsInS3(caseEmail.Parent.CaseNumber, bucketName)

    fileExists match {

      case Left(ex) => { Left(ex) }

      case Right(false) => {
        val json = generateJsonForS3FileIfFileDoesNotExist(Seq[EmailsFromSfResponse.Records](caseEmail), bucketName)
        writeEmailsJsonToS3(caseEmail.Parent.CaseNumber, json, caseEmail.Id, bucketName)
      }

      case Right(true) => {
        val emailsInS3File = getEmailsInS3File(caseEmail, bucketName)

        val emailAlreadyExistsInS3File = emailsInS3File
          .getOrElse(Seq[EmailsFromSfResponse.Records]())
          .exists(_.Composite_Key__c == caseEmail.Composite_Key__c)

        if (!emailAlreadyExistsInS3File) {
          val json = generateJsonForS3FileIfEmailDoesNotExist(caseEmail: EmailsFromSfResponse.Records, bucketName)
          writeEmailsJsonToS3(caseEmail.Parent.CaseNumber, json, caseEmail.Id, bucketName)
        } else {
          logger.warn(s"${caseEmail.Composite_Key__c} already exists in S3")
          Right(None)
        }
      }
    }
  }

  def fileAlreadyExistsInS3(fileName: String, bucketName: String): Either[CustomFailure, Boolean] = safely({
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

  def getEmailsInS3File(caseEmail: EmailsFromSfResponse.Records, bucketName: String): Either[CustomFailure, Seq[EmailsFromSfResponse.Records]] = for {
    s3FileJsonBody <- getEmailsJsonFromS3File(caseEmail.Parent.CaseNumber, bucketName)
    decodedEmails <- decode[Seq[EmailsFromSfResponse.Records]](s3FileJsonBody)
      .left
      .map(CustomFailure.fromThrowable)
  } yield decodedEmails

  def writeEmailsJsonToS3(fileName: String, caseEmailsJson: String, emailId: String, bucketName: String): Either[CustomFailure, Option[String]] = {

    val uploadResponse = for {
      putRequest <- generateS3PutRequest(bucketName, fileName)
      requestBody <- generatePutRequestBody(caseEmailsJson)
      uploadResult <- uploadFileToS3(putRequest, requestBody)
    } yield uploadResult

    uploadResponse match {
      case Left(ex) => { Left(ex) }
      case Right(value) => { Right(Some(emailId)) }
    }
  }

  def getEmailsJsonFromS3File(fileName: String, bucketName: String): Either[CustomFailure, String] = for {
    inputStream <- getS3File(fileName, bucketName)
  } yield {
    Source.fromInputStream(inputStream).mkString
  }

  def getS3File(fileName: String, bucketName: String): Either[CustomFailure, ResponseInputStream[GetObjectResponse]] = safely(
    AwsS3.client.getObject(
      GetObjectRequest.builder
        .bucket(bucketName)
        .key(fileName)
        .build()
    )
  )

  def generatePutRequestBody(caseEmailsJson: String): Either[CustomFailure, RequestBody] = safely(
    RequestBody.fromString(caseEmailsJson, StandardCharsets.UTF_8)
  )

  def uploadFileToS3(putRequest: PutObjectRequest, requestBody: RequestBody): Either[CustomFailure, Try[PutObjectResponse]] = safely(
    UploadToS3.putObject(putRequest, requestBody)
  )

  def generateS3PutRequest(bucketName: String, fileName: String): Either[CustomFailure, PutObjectRequest] = safely(
    PutObjectRequest
      .builder
      .bucket(bucketName)
      .key(fileName)
      .build()
  )

  def generateJsonForS3FileIfEmailDoesNotExist(caseEmail: EmailsFromSfResponse.Records, bucketName: String): String = {
    val emailsInS3File = getEmailsInS3File(caseEmail, bucketName)

    val emailAlreadyExistsInS3File = emailsInS3File
      .getOrElse(Seq[EmailsFromSfResponse.Records]())
      .exists(_.Composite_Key__c == caseEmail.Composite_Key__c)

    if (emailAlreadyExistsInS3File)
      ""
    else {
      (emailsInS3File.getOrElse(Seq[EmailsFromSfResponse.Records]()) :+ caseEmail).asJson.toString()
    }
  }

  def generateJsonForS3FileIfFileDoesNotExist(caseEmailsToSaveToS3: Seq[EmailsFromSfResponse.Records], bucketName: String): String = {
    caseEmailsToSaveToS3.asJson.toString()
  }
}
