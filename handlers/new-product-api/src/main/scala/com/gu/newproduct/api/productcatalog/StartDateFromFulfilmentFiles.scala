package com.gu.newproduct.api.productcatalog

import java.time.{DayOfWeek, LocalDate}

import cats.syntax.all._
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

  implicit val dayOfWeekFormat: KeyReads[DayOfWeek] = { (key: String) =>
    JsResult.fromTry(Try(DayOfWeek.valueOf(key.toUpperCase)))
  }

  private val productTypesWithFulfilmentDateFiles: List[ProductType] = List(
    ProductType.GuardianWeekly,
    ProductType.NewspaperHomeDelivery,
    ProductType.NewspaperVoucherBook,
    ProductType.NewspaperDigitalVoucher,
    ProductType.NewspaperNationalDelivery,
  )

  def apply(
      stage: Stage,
      fetchString: StringFromS3,
      today: LocalDate,
  ): Either[String, (ProductType, List[DayOfWeek]) => LocalDate] = {
    for {
      fulfilmentFileMap <- fetchFulfilmentFilesFromS3(productTypesWithFulfilmentDateFiles, fetchString, today, stage)
      mappings <- getStartDatesFromFulfillmentFiles(fulfilmentFileMap)
    } yield {
      logger.info(s"Successfully fetched start date mappings from fulfilment date files: $mappings")
      lookupStartDate(mappings) _
    }
  }

  private def ascending(d1: LocalDate, d2: LocalDate) = d1.isBefore(d2)

  def lookupStartDate(
      startDateMappings: Map[ProductType, Map[DayOfWeek, LocalDate]],
  )(productType: ProductType, issueDays: List[DayOfWeek]): LocalDate = {
    startDateMappings(productType)
      .collect { case (issueDay, startDate) if issueDays.contains(issueDay) => startDate }
      .toList
      .sortWith(ascending)
      .head
  }

  private def fetchFulfilmentFilesFromS3(
      productTypes: List[ProductType],
      fetchString: StringFromS3,
      today: LocalDate,
      stage: Stage,
  ): Either[String, Map[ProductType, String]] = {
    productTypes
      .traverse { productType =>
        val key = s"${productType.value}/${today}_${productType.value}.json"
        val bucket = s"fulfilment-date-calculator-${stage.value.toLowerCase}"
        for {
          fulfilmentFileContent <- fetchString(
            S3Location(
              bucket = bucket,
              key = key,
            ),
          ).toEither.leftMap(ex => s"Failed to fetch s3://$bucket/$key from s3: $ex")
        } yield (productType -> fulfilmentFileContent)
      }
      .map(_.toMap)
  }

  private def getStartDatesFromFulfillmentFiles(
      fulfilmentFileContents: Map[ProductType, String],
  ): Either[String, Map[ProductType, Map[DayOfWeek, LocalDate]]] = {
    fulfilmentFileContents.toList
      .traverse { case (productType, fileContent) =>
        for {
          parseFulfillmentFile <- Either
            .catchNonFatal(Json.parse(fileContent))
            .leftMap(ex => s"Failed to parse fulfilment file for $productType: $ex")
          wireCatalog <- Either
            .catchNonFatal(parseFulfillmentFile.as[Map[DayOfWeek, FulfilmentDates]])
            .left
            .map(ex => s"Failed to decode fulfilment file $productType: $ex")
          soonestDate = wireCatalog.view
            .mapValues(_.newSubscriptionEarliestStartDate)
            .collect { case (key, Some(value)) => key -> value }
            .toMap
        } yield (productType -> soonestDate)
      }
      .map(_.toMap)
  }
}
