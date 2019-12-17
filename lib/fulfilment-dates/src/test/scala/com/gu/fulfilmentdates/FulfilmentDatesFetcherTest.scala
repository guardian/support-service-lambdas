package com.gu.fulfilmentdates

import java.time.DayOfWeek.MONDAY
import java.time.LocalDate

import com.gu.effects.S3Location
import com.gu.util.config.Stage
import com.gu.zuora.ZuoraProductTypes
import org.scalatest.Matchers._
import org.scalatest.{FlatSpec, Inside}

import scala.io.Source
import scala.util.{Failure, Success, Try}

class FulfilmentDatesFetcherTest extends FlatSpec {
  "FulfilmentDatesFetcher" should "fetch and parse fulfilment dates from s3" in {
    def fetchFromS3(s3Location: S3Location): Try[String] = {
      s3Location match {
        case S3Location(
          "fulfilment-date-calculator-dev",
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
              MONDAY -> FulfilmentDates(
                today = LocalDate.parse("2019-12-11"),
                deliveryAddressChangeEffectiveDate = LocalDate.parse("2019-12-16"),
                holidayStopFirstAvailableDate = LocalDate.parse("2019-12-16"),
                finalFulfilmentFileGenerationDate = LocalDate.parse("2019-12-12"),
              )
            )
          )
      }
  }
}
