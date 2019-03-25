package com.gu.salesforce.braze.upload

import io.circe.generic.auto._
import io.circe.parser._
import io.github.mkotsur.aws.handler.Lambda._
import io.github.mkotsur.aws.handler.Lambda
import com.amazonaws.services.lambda.runtime.Context
import com.amazonaws.services.s3.AmazonS3Client
import com.typesafe.scalalogging.LazyLogging
import scalaj.http.Http
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
    CheckPreconditions(event)

    FilesFromBraze(event).foreach { filename =>
      val csvContent = ReadCsvFileFromS3Bucket(filename)
      UploadFileToSalesforce(csvContent, filename)
      DeleteCsvFileFromS3Bucket(filename)
    }

    CheckPostconditions(event)
    SuccessResponse(event)
  }
}

object SuccessResponse extends LazyLogging {
  def apply(event: Event) = {
    val successMessage = s"Successfully uploaded files to Salesforce: ${FilesFromBraze(event)}"
    logger.info(successMessage)
    Right(successMessage)
  }
}

object CheckPostconditions {
  def apply(event: Event): Any = {
    S3BucketShouldBeEmpty()
  }
}

object CheckPreconditions {
  def apply(event: Event): Any = {
    assert(event.Records.forall(_.eventName == "ObjectCreated:Put"), "Only creation events should be handled")
    S3BucketShouldBeEmpty()
    assert(FilesFromBraze(event).nonEmpty, "Braze should write at least one file to S3 bucket")
    assert(FilesFromBraze(event).forall(_.contains("*.csv")), "Braze should write only CSV files to S3 bucket")
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
    val inputStream = AmazonS3Client.builder.build().getObject(bucketName, key).getObjectContent
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
object UploadFileToSalesforce {
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

object ReadCsvFileFromS3Bucket {
  def apply(key: String): String = {
    val inputStream = AmazonS3Client.builder.build().getObject(BucketName(), key).getObjectContent
    Source.fromInputStream(inputStream).mkString
  }
}

object DeleteCsvFileFromS3Bucket {
  def apply(key: String) = {
    AmazonS3Client.builder.build().deleteObject(BucketName(), key)
  }
}

object S3BucketShouldBeEmpty {
  def apply() = {
    assert(
      AmazonS3Client.builder.build().listObjects(BucketName()).getObjectSummaries.size() == 0,
      "Bucket must be empty before and after upload to salesforce"
    )
  }
}

object SalesforceDocumentFolderId {
  def apply(): String = {
    System.getenv("Stage") match {
      case "CODE" => "00l25000000FITF" // marioTest
      case "PROD" => "00l0J000002DA3K" // FIXME: currently marioTest, so use `Guardian Weekly Price Rise Letters 2019` b00l0J000002DA22
    }
  }
}
