package com.gu.supporter.fulfilment

import java.io.ByteArrayInputStream
import java.time.LocalDate
import java.time.format.DateTimeFormatter

import com.amazonaws.services.lambda.runtime.Context
import com.amazonaws.services.s3.AmazonS3Client
import com.amazonaws.services.s3.model.{CannedAccessControlList, ObjectMetadata, PutObjectRequest}
import com.typesafe.scalalogging.LazyLogging
import io.github.mkotsur.aws.handler.Lambda
import io.github.mkotsur.aws.handler.Lambda._
import io.circe.generic.auto._
import io.circe.syntax._

case class FulfilmentDates(
  today: LocalDate,
  acquisitionsStartDate: LocalDate,
  deliveryAddressChangeEffectiveDate: LocalDate,
  holidayStopFirstAvailableDate: LocalDate,
  finalFulfilmentFileGenerationDate: LocalDate,
  nextAffectablePublicationDateOnFrontCover: LocalDate
)

class FulfilmentDateCalculator extends Lambda[String, String] with LazyLogging {
  override def handle(todayOverride: String, context: Context) = {
    val today = LocalDate.now()
    val todayAsString = today.format(DateTimeFormatter.ofPattern("yyyy-MM-dd"))
    val fulfilmentDates = FulfilmentDates(today, today, today, today, today, today)
    writeToBucket("WEEKLY", todayAsString, fulfilmentDates.asJson.spaces2)
    Right(todayOverride)
  }

  private def writeToBucket(product: String, date: String, content: String) = {
    val filename = s"${product}/${date}_${product}.json"
    val s3Client = AmazonS3Client.builder.build
    val stage = System.getenv("Stage").toLowerCase
    val requestWithAcl = putRequestWithAcl(s"fulfilment-date-calculator-$stage", filename, content)
    s3Client.putObject(requestWithAcl)
  }

  private def putRequestWithAcl(bucket: String, key: String, content: String): PutObjectRequest =
    new PutObjectRequest(
      bucket,
      key,
      new ByteArrayInputStream(content.getBytes),
      new ObjectMetadata
    ).withCannedAcl(CannedAccessControlList.BucketOwnerRead)
}

