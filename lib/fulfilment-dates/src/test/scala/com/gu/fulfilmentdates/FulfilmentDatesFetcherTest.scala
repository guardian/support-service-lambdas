package com.gu.fulfilmentdates

import java.time.LocalDate

import com.gu.effects.S3Location
import com.gu.util.config.Stage
import org.scalatest.{FlatSpec, Inside}
import org.scalatest.Matchers._

import scala.io.Source
import scala.util.{Failure, Success, Try}

class FulfilmentDatesFetcherTest extends FlatSpec {
  "FulfilmentDatesFetcher" should "fetch and parse fulfilment dates from s3" in {
    def fetchFromS3(s3Location: S3Location): Try[String] = {
      s3Location match {
        case S3Location(
          "fulfilment-date-calculator-DEV",
          "Newspaper - Home Delivery/2019-12-11_Newspaper - Home Delivery.json"
          ) =>
          Success(Source.fromResource("Newspaper - Home Delivery.json").mkString)
        case _ =>
          Failure(new Throwable("s3 failed"))
      }
    }

    Inside.inside(
      FulfilmentDatesFetcher(fetchFromS3, Stage("DEV"))
        .getFulfilmentDates(
          ZuoraProductTypes.NewspaperHomeDelivery,
          LocalDate.of(2019, 12, 11)
        )
    ) {
        case Right(fulfilmentDates) =>
          fulfilmentDates should ===(
            Map(
              "Monday" -> FulfilmentDates(
                today = LocalDate.parse("2019-12-11"),
                acquisitionsStartDate = LocalDate.parse("2019-12-16"),
                deliveryAddressChangeEffectiveDate = LocalDate.parse("2019-12-16"),
                holidayStopFirstAvailableDate = LocalDate.parse("2019-12-16"),
                finalFulfilmentFileGenerationDate = LocalDate.parse("2019-12-12"),
                nextAffectablePublicationDateOnFrontCover = LocalDate.parse("2019-12-16")
              ),
              "Tuesday" -> FulfilmentDates(
                today = LocalDate.parse("2019-12-11"),
                acquisitionsStartDate = LocalDate.parse("2019-12-17"),
                deliveryAddressChangeEffectiveDate = LocalDate.parse("2019-12-17"),
                holidayStopFirstAvailableDate = LocalDate.parse("2019-12-17"),
                finalFulfilmentFileGenerationDate = LocalDate.parse("2019-12-15"),
                nextAffectablePublicationDateOnFrontCover = LocalDate.parse("2019-12-17")
              ),
              "Wednesday" -> FulfilmentDates(
                today = LocalDate.parse("2019-12-11"),
                acquisitionsStartDate = LocalDate.parse("2019-12-18"),
                deliveryAddressChangeEffectiveDate = LocalDate.parse("2019-12-18"),
                holidayStopFirstAvailableDate = LocalDate.parse("2019-12-18"),
                finalFulfilmentFileGenerationDate = LocalDate.parse("2019-12-16"),
                nextAffectablePublicationDateOnFrontCover = LocalDate.parse("2019-12-18")
              ),
              "Thursday" -> FulfilmentDates(
                today = LocalDate.parse("2019-12-11"),
                acquisitionsStartDate = LocalDate.parse("2019-12-19"),
                deliveryAddressChangeEffectiveDate = LocalDate.parse("2019-12-19"),
                holidayStopFirstAvailableDate = LocalDate.parse("2019-12-19"),
                finalFulfilmentFileGenerationDate = LocalDate.parse("2019-12-17"),
                nextAffectablePublicationDateOnFrontCover = LocalDate.parse("2019-12-19")
              ),
              "Friday" -> FulfilmentDates(
                today = LocalDate.parse("2019-12-11"),
                acquisitionsStartDate = LocalDate.parse("2019-12-20"),
                deliveryAddressChangeEffectiveDate = LocalDate.parse("2019-12-20"),
                holidayStopFirstAvailableDate = LocalDate.parse("2019-12-20"),
                finalFulfilmentFileGenerationDate = LocalDate.parse("2019-12-18"),
                nextAffectablePublicationDateOnFrontCover = LocalDate.parse("2019-12-20")
              ),
              "Saturday" -> FulfilmentDates(
                today = LocalDate.parse("2019-12-11"),
                acquisitionsStartDate = LocalDate.parse("2019-12-14"),
                deliveryAddressChangeEffectiveDate = LocalDate.parse("2019-12-14"),
                holidayStopFirstAvailableDate = LocalDate.parse("2019-12-14"),
                finalFulfilmentFileGenerationDate = LocalDate.parse("2019-12-12"),
                nextAffectablePublicationDateOnFrontCover = LocalDate.parse("2019-12-14")
              ),
              "Sunday" -> FulfilmentDates(
                today = LocalDate.parse("2019-12-11"),
                acquisitionsStartDate = LocalDate.parse("2019-12-15"),
                deliveryAddressChangeEffectiveDate = LocalDate.parse("2019-12-15"),
                holidayStopFirstAvailableDate = LocalDate.parse("2019-12-15"),
                finalFulfilmentFileGenerationDate = LocalDate.parse("2019-12-12"),
                nextAffectablePublicationDateOnFrontCover = LocalDate.parse("2019-12-15")
              )
            )
          )
      }
  }
}
