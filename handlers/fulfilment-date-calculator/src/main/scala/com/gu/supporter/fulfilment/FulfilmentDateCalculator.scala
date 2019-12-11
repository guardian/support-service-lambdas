package com.gu.supporter.fulfilment

import java.io.ByteArrayInputStream
import java.time.LocalDate

import com.amazonaws.services.lambda.runtime.Context
import com.amazonaws.services.s3.model.{CannedAccessControlList, ObjectMetadata, PutObjectRequest, PutObjectResult}
import com.gu.effects.{S3Location, UploadToS3}
import com.gu.fulfilmentdates.FulfilmentDatesLocation.fulfilmentDatesFileLocation
import com.gu.fulfilmentdates.ZuoraProductTypes.{GuardianWeekly, NewspaperHomeDelivery, ZuoraProductType}
import com.gu.util.config.Stage
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

    val datesForYesterdayThroughToAFortnight = (-1 to 14).map(_.toLong).map(today.plusDays)

    datesForYesterdayThroughToAFortnight.foreach { date =>

      writeToBucket(GuardianWeekly, date, GuardianWeeklyFulfilmentDates(date).asJson.spaces2)

      writeToBucket(NewspaperHomeDelivery, date, HomeDeliveryFulfilmentDates(date).asJson.spaces2)

    }

    Right(s"Generated Guardian Weekly and Home Delivery dates for $datesForYesterdayThroughToAFortnight")
  }

  private def inputToDate(maybeTodayOverride: Option[String]): LocalDate = {
    maybeTodayOverride match {
      case None => LocalDate.now
      case Some(todayOverride) => LocalDate.parse(todayOverride.replaceAll("\"", ""))
    }
  }

  private def writeToBucket(product: ZuoraProductType, date: LocalDate, content: String): PutObjectResult = {
    UploadToS3.putObject(
      putRequestWithAcl(
        fulfilmentDatesFileLocation(Stage(), product, date),
        content
      )
    ).get
  }

  private def putRequestWithAcl(s3Location: S3Location, content: String): PutObjectRequest =
    new PutObjectRequest(
      s3Location.bucket,
      s3Location.key,
      new ByteArrayInputStream(content.getBytes),
      new ObjectMetadata
    ).withCannedAcl(CannedAccessControlList.BucketOwnerRead)
}

