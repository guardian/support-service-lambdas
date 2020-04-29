package com.gu.newproduct.api.productcatalog

import java.time.{DayOfWeek, LocalDate}

import cats.implicits._
import com.gu.effects.S3Location
import com.gu.util.config.LoadConfigModule.StringFromS3
import com.gu.util.config.Stage
import com.typesafe.scalalogging.LazyLogging
import play.api.libs.json._

import scala.util.Try

object StartDateFromFulfilmentFiles extends LazyLogging {
  case class FulfilmentDates(newSubscriptionEarliestStartDate: Option[LocalDate])

  object FulfilmentDates {
    implicit val reads: Reads[FulfilmentDates] = Json.reads[FulfilmentDates]
  }

  implicit val dayOfWeekFormat: KeyReads[DayOfWeek] = {
    (key: String) => JsResult.fromTry(Try(DayOfWeek.valueOf(key.toUpperCase)))
  }

  private val productTypesWithFulfilmentDateFiles = List(
    ProductType.GuardianWeekly,
    ProductType.NewspaperHomeDelivery,
    ProductType.NewspaperVoucherBook
  )

  def apply(stage: Stage, fetchString: StringFromS3, today: LocalDate): Either[String, (ProductType, List[DayOfWeek]) => LocalDate] = {
    for {
      mappings <- productTypesWithFulfilmentDateFiles.traverse { productType =>
        getStartDateForProductType(stage, fetchString, today, productType)
          .map(startDate => productType -> startDate)
      }
      _ = logger.info(s"Successfully fetched start date mappings from fulfilment date files: ${mappings}")
    } yield lookupStartDateFunction(mappings.toMap) _
  }

  private def ascending(d1: LocalDate, d2: LocalDate) = d1.isBefore(d2)

  def lookupStartDateFunction(startDateMappings: Map[ProductType, Map[DayOfWeek, LocalDate]])(productType: ProductType, issueDays: List[DayOfWeek]): LocalDate = {
    startDateMappings(productType)
      .collect { case (issueDay, startDate) if issueDays.contains(issueDay) => startDate }
      .toList
      .sortWith(ascending)
      .head
  }

  private def getStartDateForProductType(
    stage: Stage,
    fetchString: StringFromS3,
    today: LocalDate,
    productType: ProductType
  ): Either[String, Map[DayOfWeek, LocalDate]] = {
    val key = s"${productType.value}/${today}_${productType.value}.json"
    val bucket = s"fulfilment-date-calculator-${stage.value.toLowerCase}"
    for {
      fulfilmentFileContents <- fetchString(
        S3Location(
          bucket = bucket,
          key = key
        )
      ).toEither.leftMap(ex => s"Failed to fetch s3://$bucket/$key from s3: $ex")
      parseFulfillmentFile <- Either
        .catchNonFatal(Json.parse(fulfilmentFileContents))
        .leftMap(ex => s"Failed to parse fulfilment file s3://$bucket/$key: $ex")
      wireCatalog <- Either
        .catchNonFatal(parseFulfillmentFile.as[Map[DayOfWeek, FulfilmentDates]])
        .leftMap(ex => s"Failed to decode fulfilment file s3://$bucket/$key: $ex")
      soonestDate = wireCatalog
        .mapValues(_.newSubscriptionEarliestStartDate)
        .collect { case (key, Some(value)) => key -> value }
    } yield soonestDate
  }
}
