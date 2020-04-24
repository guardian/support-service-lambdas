package com.gu.newproduct.api.productcatalog

import java.time.LocalDate

import cats.implicits._
import com.gu.effects.S3Location
import com.gu.util.config.LoadConfigModule.StringFromS3
import com.gu.util.config.Stage
import com.typesafe.scalalogging.LazyLogging
import play.api.libs.json._

object StartDateFromProductType extends LazyLogging {
  case class FulfilmentDates(deliveryAddressChangeEffectiveDate: LocalDate)

  object FulfilmentDates {
    implicit val reads = Json.format[FulfilmentDates]
  }

  private val productTypesWithFulfilmentDateFiles = List(
    ProductType.GuardianWeekly,
    ProductType.NewspaperHomeDelivery,
    ProductType.NewspaperVoucherBook
  )

  def apply(stage: Stage, fetchString: StringFromS3, today: LocalDate): Either[String, Map[ProductType, LocalDate]] = {
    for {
      mappings <- productTypesWithFulfilmentDateFiles.traverse { productType =>
        getStartDateForProductType(stage, fetchString, today, productType)
          .map(startDate => productType -> startDate)
      }
      _ = logger.info(s"Successfully fetched start date mappings from fulfilment date files: ${mappings}")
    } yield mappings.toMap
  }

  private def getStartDateForProductType(
    stage: Stage,
    fetchString: StringFromS3,
    today: LocalDate,
    productType: ProductType
  ): Either[String, LocalDate] = {
    def ascending(d1: LocalDate, d2: LocalDate) = d1.isBefore(d2)

    val key = s"${productType.value}/${today}_${productType.value}.json"
    for {
      fulfilmentFileContents <- fetchString(
        S3Location(
          bucket = s"fulfilment-date-calculator-${stage.value}",
          key = key
        )
      ).toEither.leftMap(ex => s"Failed to fetch $key from s3: $ex")
      parseFulfillmentFile <- Either
        .catchNonFatal(Json.parse(fulfilmentFileContents))
        .leftMap(ex => s"Failed to parse fulfilment file $key: $ex")
      wireCatalog <- Either
        .catchNonFatal(parseFulfillmentFile.as[Map[String, FulfilmentDates]])
        .leftMap(ex => s"Failed to decode fulfilment file $key: $ex")
      soonestDate <- wireCatalog
        .map(_._2.deliveryAddressChangeEffectiveDate)
        .toList
        .sortWith(ascending)
        .headOption
        .toRight(s"Fulfilment file $key does not contain any data")
    } yield soonestDate
  }
}
