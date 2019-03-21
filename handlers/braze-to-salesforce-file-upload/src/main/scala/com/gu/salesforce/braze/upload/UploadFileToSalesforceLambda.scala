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

class UploadFileToSalesforceLambda extends Lambda[Event, String] with LazyLogging {
  override def handle(event: Event, context: Context) = {
    logger.info(event.toString)
    Right(s"Successfully uploaded file to Salesforce")
  }
}

