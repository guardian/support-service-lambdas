package com.gu.supporter.fulfilment

import java.io.ByteArrayInputStream
import java.time.LocalDate
import java.time.format.DateTimeFormatter

import com.amazonaws.services.lambda.runtime.Context
import com.amazonaws.services.s3.AmazonS3Client
import com.amazonaws.services.s3.model.{CannedAccessControlList, ObjectMetadata, PutObjectRequest, PutObjectResult}
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

class FulfilmentDateCalculator extends Lambda[Option[String], String] with LazyLogging {
  override def handle(todayOverride: Option[String], context: Context) = {
    val today = inputToDate(todayOverride)
    val fulfilmentDates = GuardianWeeklyFulfilmentDates(today)
    writeToBucket("WEEKLY", today, fulfilmentDates.asJson.spaces2)
    Right(s"Generated Guardian Weekly dates for $today")
  }

  private def inputToDate(maybeTodayOverride: Option[String]): LocalDate = {
    maybeTodayOverride match {
      case None => LocalDate.now
      case Some(todayOverride) => LocalDate.parse(todayOverride.replaceAll("\"", ""))
    }
  }

  private def writeToBucket(product: String, date: LocalDate, content: String): PutObjectResult = {
    val today = date.format(DateTimeFormatter.ofPattern("yyyy-MM-dd"))
    val filename = s"${product}/${today}_${product}.json"
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

