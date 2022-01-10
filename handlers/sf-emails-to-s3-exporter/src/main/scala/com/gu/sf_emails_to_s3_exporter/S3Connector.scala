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
  def saveEmailsToS3(response: EmailsFromSfResponse.Response): Seq[String] = {
    val sfEmailsGroupedByCaseNumber = response
      .records
      .groupBy(_.Parent.CaseNumber)

    //save files to s3 and return successes

    val ghu = sfEmailsGroupedByCaseNumber.map {
      case (caseNumber, caseRecords) => {

        writeEmailsJsonToS3(
          caseNumber,
          getCreateOrAppendJson(caseNumber, caseRecords)
        )

      }
    }.toSeq
      .filter(_.isRight).flatMap(_.right.get)
    println("ghu.size:" + ghu.size);
    ghu
  }

  def writeEmailsJsonToS3(fileName: String, caseEmailsJson: String): Either[Throwable, Seq[String]] = {

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

          //get the email Ids from caseEmailsJson
          val decodedJson = decode[Seq[EmailsFromSfResponse.Records]](caseEmailsJson)

          for {
            ids <- decodedJson.map(p => p.map(a => a.Id))
          } yield {
            ids
          }
          //          val ids = decodedJson.map(p => p.map(a => a.Id))
          //          println("decodedJson:" + decodedJson)
          //          println("ids:" + ids)
          //          ids
        }
      )

    //println("awsResponse:" + awsResponse)
  }

  def fileExistsInS3(fileName: String): Boolean = {

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

  def getEmailsJsonFromS3File(bucketName: String, fileName: String): String = {
    val inputStream = AwsS3.client.getObject(
      GetObjectRequest.builder
        .bucket(bucketName)
        .key(fileName)
        .build()
    )

    Source.fromInputStream(inputStream).mkString
  }

  def appendToFileInS3(fileName: String, caseEmailsFromSf: Seq[EmailsFromSfResponse.Records]): Unit = {

    val emailsJsonFromS3File = getEmailsJsonFromS3File("emails-from-sf", fileName)
    val decodedCaseEmailsFromS3 = decode[Seq[EmailsFromSfResponse.Records]](emailsJsonFromS3File)

    decodedCaseEmailsFromS3 match {
      case Right(caseEmailsFromS3) => {
        val mergedEmails = mergeSfEmailsWithS3Emails(caseEmailsFromSf, caseEmailsFromS3)
        writeEmailsJsonToS3(fileName, mergedEmails.asJson.toString())
      }
      case Left(error) => throw new RuntimeException(s"something went wrong $error")
    }
  }

  def getJsonForAppend(fileName: String, caseEmailsFromSf: Seq[EmailsFromSfResponse.Records]): String = {

    val emailsJsonFromS3File = getEmailsJsonFromS3File("emails-from-sf", fileName)

    val decodedCaseEmailsFromS3 = decode[Seq[EmailsFromSfResponse.Records]](emailsJsonFromS3File)

    decodedCaseEmailsFromS3 match {
      case Right(caseEmailsFromS3) => {
        mergeSfEmailsWithS3Emails(caseEmailsFromSf, caseEmailsFromS3).asJson.toString()
      }
      case Left(error) => throw new RuntimeException(s"something went wrong $error")
    }
  }

  def mergeSfEmailsWithS3Emails(
    caseEmailsFromSf: Seq[EmailsFromSfResponse.Records],
    fileContentFromS3: Seq[EmailsFromSfResponse.Records]
  ): Seq[EmailsFromSfResponse.Records] = {

    val emailsThatExistInSfButNotS3 =
      caseEmailsFromSf.filter(sfEmail =>
        fileContentFromS3.count(S3Email =>
          S3Email.Composite_Key__c == sfEmail.Composite_Key__c) == 0)

    fileContentFromS3 ++ emailsThatExistInSfButNotS3
  }

  def getCreateOrAppendJson(caseNumber: String, caseRecords: Seq[EmailsFromSfResponse.Records]): String = {

    fileExistsInS3(caseNumber) match {

      case true => {
        println("IS APPEND")
        getJsonForAppend(
          caseNumber,
          caseRecords
        )
      }

      case false => {
        println("IS CREATE")
        caseRecords.asJson.toString()
      }
    }

  }
}
