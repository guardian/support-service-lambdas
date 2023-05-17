package com.gu.fulfilmentdates

import java.time.DayOfWeek.MONDAY
import java.time.LocalDate

import com.gu.effects.S3Location
import com.gu.util.config.Stage
import com.gu.zuora.ZuoraProductTypes
import org.scalatest.matchers.should.Matchers._
import org.scalatest.Inside

import scala.io.Source
import scala.util.{Failure, Success, Try}
import org.scalatest.matchers
import org.scalatest.flatspec.AnyFlatSpec

class FulfilmentDatesFetcherTest extends AnyFlatSpec {
  "FulfilmentDatesFetcher" should "fetch and parse fulfilment dates from s3" in {
    def fetchFromS3(s3Location: S3Location): Try[String] = {
      s3Location match {
        case S3Location(
              "fulfilment-date-calculator-code",
              "Newspaper - Home Delivery/2019-12-11_Newspaper - Home Delivery.json",
            ) =>
          Success(Source.fromResource("Newspaper - Home Delivery.json").mkString)
        case _ =>
          Failure(new Throwable("s3 failed"))
      }
    }

    Inside.inside(
      FulfilmentDatesFetcher(fetchFromS3, Stage("CODE"))
        .getFulfilmentDates(
          ZuoraProductTypes.NewspaperHomeDelivery,
          LocalDate.of(2019, 12, 11),
        ),
    ) { case Right(fulfilmentDates) =>
      fulfilmentDates should ===(
        Map(
          MONDAY -> FulfilmentDates(
            today = LocalDate.parse("2019-12-11"),
            deliveryAddressChangeEffectiveDate = LocalDate.parse("2019-12-16"),
            holidayStopFirstAvailableDate = LocalDate.parse("2019-12-16"),
            holidayStopProcessorTargetDate = None,
            finalFulfilmentFileGenerationDate = LocalDate.parse("2019-12-12"),
            newSubscriptionEarliestStartDate = LocalDate.parse("2019-12-16"),
          ),
        ),
      )
    }
  }
}
