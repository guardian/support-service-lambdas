package com.gu.newproduct.api.productcatalog

import java.time.LocalDate

import com.gu.effects.S3Location
import com.gu.util.config.Stage
import org.scalatest.{FlatSpec, Inside, Matchers}

import scala.io.Source
import scala.util.Try

class StartDateFromFulfilmentFilesTest extends FlatSpec with Matchers {
  "StartDateFromFulfilmentFiles" should "get start dates from fulfilment files" in {
    def stubFetchString(s3Location: S3Location): Try[String] = s3Location match {
      case S3Location("fulfilment-date-calculator-dev", "Guardian Weekly/2020-04-24_Guardian Weekly.json") =>
        Try(Source.fromResource("fulfilmentdatefiles/2020-04-24_Guardian Weekly.json").getLines().mkString("\n"))
      case S3Location("fulfilment-date-calculator-dev", "Newspaper - Home Delivery/2020-04-24_Newspaper - Home Delivery.json") =>
        Try(Source.fromResource("fulfilmentdatefiles/2020-04-24_Newspaper - Home Delivery.json").getLines().mkString("\n"))
    }

    Inside.inside(StartDateFromFulfilmentFiles(Stage("DEV"), stubFetchString, LocalDate.of(2020, 4, 24))) {
      case Right(startDateMap) =>
        startDateMap should equal(
          Map(
            ProductType.NewspaperHomeDelivery -> LocalDate.of(2020, 4, 28),
            ProductType.GuardianWeekly -> LocalDate.of(2020, 5, 8)
          )
        )
    }

  }

}
