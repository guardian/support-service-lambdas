package com.gu.salesforce.braze.upload

import java.io.InputStream
import java.nio.file.{Files, Paths, StandardCopyOption}

import better.files.File._
import better.files._
import com.amazonaws.services.lambda.runtime.Context
import com.typesafe.scalalogging.LazyLogging
import io.circe.generic.auto._
import io.circe.parser._
import io.github.mkotsur.aws.handler.Lambda
import io.github.mkotsur.aws.handler.Lambda._
import scalaj.http.Http
import software.amazon.awssdk.services.s3.S3Client
import software.amazon.awssdk.services.s3.model.{DeleteObjectRequest, GetObjectRequest, ListObjectsRequest}

import scala.io.Source

case class S3EventObject(key: String)
case class S3EventBucket(name: String)
case class S3Event(`object`: S3EventObject, bucket: S3EventBucket)
case class Record(s3: S3Event, eventName: String)
case class Event(Records: List[Record])

case class Config(
  stage: String,
  url: String,
  client_id: String,
  client_secret: String,
  username: String,
  password: String,
  token: String
)

case class AccessToken(access_token: String, instance_url: String)

case class UploadFileToSalesforceResponse(id: String, success: Boolean)

class UploadFileToSalesforceLambda extends Lambda[Event, String] with LazyLogging {
  override def handle(event: Event, context: Context) = {
    Preconditions(event)
    Program(event)
    Postconditions(event)
  }
}

object Program {
  def apply(event: Event): Unit =
    FilesFromBraze(event).foreach { filename =>
      val csvZip = ReadZippedFileFromS3Bucket(filename)
      val csv = UnzipToString(csvZip, filename)
      CsvConditions(csv)
      UploadCsvFileToSalesforce(csv, DropZipSuffix(filename))
      DeleteZippedFileFromS3Bucket(filename)
    }
}

object SuccessResponse extends LazyLogging {
  def apply(event: Event) = {
    val successMessage = s"Successfully uploaded files to Salesforce: ${FilesFromBraze(event).map(DropZipSuffix(_))}"
    logger.info(successMessage)
    Right(successMessage)
  }
}

object CsvConditions {
  def apply(rawCsv: String) = {
    val rows = rawCsv.split('\n')
    val consents = Consents(rows)

    // assert(rows.nonEmpty, "CSV should not be empty") // FIXME: Do we upload empty CSV files?
    assert(consents.forall(_.nonEmpty), "dm_consent CSV column must be populated")
  }
}

// subscription_name,identity_id,Renewal_Cycle,title,first_name,last_name,address1,address2,city,state,country,postcode,dm_consent,Guardian_Weekly_New_Price,currency,Frequency,Next_Payment_Date
object Consents {
  def apply(rows: Array[String]): Array[String] = {
    val consentColumnIndex = 12
    val columnsByRow = rows.map(_.split(','))
    columnsByRow.map(columns => columns(consentColumnIndex))
  }
}

object Postconditions {
  def apply(event: Event) = {
    assert(S3BucketIsEmpty(), "Bucket should be empty after upload to Salesforce")
    SuccessResponse(event)
  }
}

object Preconditions {
  def apply(event: Event): Any = {
    assert(event.Records.forall(_.eventName == "ObjectCreated:Put"), "Only creation events should be handled")
    assert(!S3BucketIsEmpty(), "Bucket should not be empty before the upload to Salesforce")
    assert(FilesFromBraze(event).nonEmpty, "Braze should write at least one file to S3 bucket")
    assert(FilesFromBraze(event).forall(_.contains(".zip")), "Braze should write only ZIP files to S3 bucket")
  }
}

object FilesFromBraze {
  def apply(event: Event): List[String] = event.Records.map(_.s3.`object`.key)
}

object ReadConfig {
  def apply(): Config = {
    val stage = System.getenv("Stage")
    val bucketName = "gu-reader-revenue-private"
    val key = s"membership/support-service-lambdas/$stage/sfAuth-$stage.v1.json"
    val inputStream = S3Client.create().getObject(
      GetObjectRequest.builder.bucket(bucketName).key(key).build()
    )
    val rawJson = Source.fromInputStream(inputStream).mkString
    decode[Config](rawJson)
      .getOrElse(throw new RuntimeException(s"Could not read secret config file from S3://$bucketName/$key"))
  }
}

object AccessToken {
  def apply(): AccessToken = {
    val config = ReadConfig()
    val authHost = System.getenv("Stage") match {
      case "CODE" => "https://test.salesforce.com"
      case "PROD" => "https://login.salesforce.com"
    }
    val response = Http(s"$authHost/services/oauth2/token")
      .postForm(Seq(
        "grant_type" -> "password",
        "client_id" -> config.client_id,
        "client_secret" -> config.client_secret,
        "username" -> config.username,
        "password" -> s"${config.password}${config.token}"
      ))
      .asString

    response.code match {
      case 200 => decode[AccessToken](response.body).getOrElse(throw new RuntimeException(s"Failed to decode oauth response: ${response}"))
      case _ => throw new RuntimeException(s"Failed to generate oauth token: ${response}")
    }
  }
}

// https://developer.salesforce.com/docs/atlas.en-us.api_rest.meta/api_rest/dome_sobject_insert_update_blob.htm
object UploadCsvFileToSalesforce {
  def apply(csvContent: String, filename: String): Unit = {
    val body =
      s"""
        |--boundary
        |Content-Disposition: form-data; name="entity_document";
        |Content-Type: application/json
        |
        |{
        |    "Description" : "Braze to Salesforce upload of Guardian Weekly price rise letters for Latcham Direct: $filename",
        |    "Keywords" : "Guardian Weekly,price rise,letters, latcham",
        |    "FolderId" : "${SalesforceDocumentFolderId()}",
        |    "Name" : "$filename",
        |    "Type" : "csv"
        |}
        |
        |--boundary
        |Content-Type: application/csv
        |Content-Disposition: form-data; name="Body"; filename="$filename"
        |
        |$csvContent
        |
        |--boundary--
      """.stripMargin

    val accessToken = AccessToken()
    val response = Http(s"${accessToken.instance_url}/services/data/v29.0/sobjects/Document/")
      .header("Authorization", s"Bearer ${accessToken.access_token}")
      .header("Content-Type", "multipart/form-data; boundary=boundary")
      .postData(body)
      .method("POST")
      .asString

    response.code match {
      case 201 =>
        val uploadResponse =
          decode[UploadFileToSalesforceResponse](response.body)
            .getOrElse(throw new RuntimeException(s"Failed to decode UploadFileToSalesforceResponse: $response"))

        assert(uploadResponse.success, s"$filename should be uploaded to Salesforce document: $uploadResponse")

      case _ =>
        throw new RuntimeException(s"Failed to execute request UploadFileToSalesforce: ${response}")
    }
  }
}

object BucketName {
  def apply(): String =
    System.getenv("Stage") match {
      case "CODE" => "braze-to-salesforce-file-upload-code"
      case "PROD" => "braze-to-salesforce-file-upload-prod"
    }
}

object ReadZippedFileFromS3Bucket {
  def apply(key: String): InputStream =
    S3Client.create().getObject(GetObjectRequest.builder.bucket(BucketName()).key(key).build())
}

// https://github.com/pathikrit/better-files
object UnzipToString {
  def apply(inputStream: InputStream, filename: String): String = {
    Files.copy(inputStream, Paths.get(s"/tmp/$filename"), StandardCopyOption.REPLACE_EXISTING)
    file"/tmp/$filename".unzipTo(root / "tmp")
    (root / "tmp" / s"${DropZipSuffix(filename)}").contentAsString
  }
}

object DropZipSuffix {
  def apply(filename: String): String = filename.dropRight(4) // drop .zip
}

object DeleteZippedFileFromS3Bucket {
  def apply(key: String) = {
    S3Client.create().deleteObject(
      DeleteObjectRequest.builder.bucket(BucketName()).key(key).build()
    )
  }
}

object S3BucketIsEmpty {
  def apply(): Boolean =
    !S3Client.create().listObjects(
      ListObjectsRequest.builder.bucket(BucketName()).build()
    ).hasContents
}

object SalesforceDocumentFolderId {
  def apply(): String = {
    System.getenv("Stage") match {
      case "CODE" => "00l25000000FITF" // marioTest
      case "PROD" => "00l0J000002DA3K" // FIXME: currently marioTest, so use `Guardian Weekly Price Rise Letters 2019` b00l0J000002DA22
    }
  }
}
