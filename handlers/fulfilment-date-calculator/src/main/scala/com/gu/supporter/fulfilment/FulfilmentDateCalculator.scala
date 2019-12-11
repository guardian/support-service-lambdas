package com.gu.supporter.fulfilment

import java.io.ByteArrayInputStream
import java.time.LocalDate
import java.time.format.DateTimeFormatter

import com.amazonaws.services.lambda.runtime.Context
import com.amazonaws.services.s3.AmazonS3Client
import com.amazonaws.services.s3.model.{CannedAccessControlList, ObjectMetadata, PutObjectRequest, PutObjectResult}
import com.gu.supporter.fulfilment.ZuoraProductTypes.{GuardianWeekly, NewspaperHomeDelivery, ZuoraProductType}
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

    writeToBucket(GuardianWeekly, today, GuardianWeeklyFulfilmentDates(today).asJson.spaces2)

    writeToBucket(NewspaperHomeDelivery, today, HomeDeliveryFulfilmentDates(today).asJson.spaces2)

    Right(s"Generated Guardian Weekly and Home Delivery dates for $today")
  }

  private def inputToDate(maybeTodayOverride: Option[String]): LocalDate = {
    maybeTodayOverride match {
      case None => LocalDate.now
      case Some(todayOverride) => LocalDate.parse(todayOverride.replaceAll("\"", ""))
    }
  }

  private def writeToBucket(product: ZuoraProductType, date: LocalDate, content: String): PutObjectResult = {
    val today = date.format(DateTimeFormatter.ofPattern("yyyy-MM-dd"))
    val filename = s"${product.name}/${today}_${product.name}.json"
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

