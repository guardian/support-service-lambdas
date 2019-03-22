package com.gu.salesforce.braze.upload

import java.io.ByteArrayInputStream
import java.nio.charset.StandardCharsets
import java.time.LocalDate
import java.time.format.DateTimeFormatter
import io.circe.generic.auto._
import io.circe.parser._
import io.github.mkotsur.aws.handler.Lambda._
import io.github.mkotsur.aws.handler.Lambda
import com.amazonaws.services.lambda.runtime.Context
import com.amazonaws.services.s3.AmazonS3Client
import com.amazonaws.services.s3.model.{CannedAccessControlList, ObjectMetadata, PutObjectRequest}
import com.typesafe.scalalogging.LazyLogging
import scalaj.http.Http
import scala.io.Source
import scala.concurrent.duration._
import scala.util.Try

/*
{
    "Records": [
        {
            "eventVersion": "2.1",
            "eventSource": "aws:s3",
            "awsRegion": "eu-west-1",
            "eventTime": "2019-03-21T14:40:00.210Z",
            "eventName": "ObjectCreated:Put",
            "userIdentity": {
                "principalId": "AWS:AROAJ2472JG7IDEUTKPNU:mario.galic"
            },
            "requestParameters": {
                "sourceIPAddress": "77.91.250.236"
            },
            "responseElements": {
                "x-amz-request-id": "C53A0297488F6BAB",
                "x-amz-id-2": "DS4x4B/R3dixDAcQJF2/08EUaUhiowK3hiW9V56cYeesG2HPXFwbjz1yewUGXde2QnzJ5jyIRE8="
            },
            "s3": {
                "s3SchemaVersion": "1.0",
                "configurationId": "9553147c-84da-4616-b446-7084781908b0",
                "bucket": {
                    "name": "braze-to-salesforce-upload-code",
                    "ownerIdentity": {
                        "principalId": "A3FCSJUA4O7GBA"
                    },
                    "arn": "arn:aws:s3:::braze-to-salesforce-upload-code"
                },
                "object": {
                    "key": "Account.csv",
                    "size": 1043872,
                    "eTag": "aa47941dff62732c82effe6962e87451",
                    "sequencer": "005C93A2401DBEE37E"
                }
            }
        }
    ]
}
 */

case class S3EventObject(key: String)
case class S3Event(`object`: S3EventObject)
case class Record(s3: S3Event)
case class Event(Records: List[Record])

//case class Event(Records: List[{
//  val s3: {
//    val `object`: {
//      val key: String
//    }
//  }
//}])

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

class UploadFileToSalesforceLambda extends Lambda[Event, String] with LazyLogging {
  override def handle(event: Event, context: Context) = {
    logger.info(event.toString)
    logger.info(AccessToken().toString)
    Right(s"Successfully uploaded file to Salesforce")
  }
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
    val response = Http(s"${config.url}/services/oauth2/token")
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
