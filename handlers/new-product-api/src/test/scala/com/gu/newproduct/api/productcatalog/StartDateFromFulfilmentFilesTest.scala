package com.gu.newproduct.api.productcatalog

import java.time.{DayOfWeek, LocalDate}
import java.time.DayOfWeek._

import com.gu.effects.S3Location
import com.gu.util.config.Stage
import org.scalatest.Inside

import scala.io.Source
import scala.util.Try
import org.scalatest.flatspec.AnyFlatSpec
import org.scalatest.matchers.should.Matchers

class StartDateFromFulfilmentFilesTest extends AnyFlatSpec with Matchers {
  def stubFetchString(s3Location: S3Location): Try[String] = s3Location match {
    case S3Location("fulfilment-date-calculator-dev", "Guardian Weekly/2020-04-27_Guardian Weekly.json") =>
      Try(Source.fromResource("fulfilmentdatefiles/2020-04-27_Guardian Weekly.json").getLines().mkString("\n"))
    case S3Location(
          "fulfilment-date-calculator-dev",
          "Newspaper - Home Delivery/2020-04-27_Newspaper - Home Delivery.json",
        ) =>
      Try(
        Source.fromResource("fulfilmentdatefiles/2020-04-27_Newspaper - Home Delivery.json").getLines().mkString("\n"),
      )
    case S3Location(
          "fulfilment-date-calculator-dev",
          "Newspaper - Voucher Book/2020-04-27_Newspaper - Voucher Book.json",
        ) =>
      Try(Source.fromResource("fulfilmentdatefiles/2020-04-27_Newspaper - Voucher Book.json").getLines().mkString("\n"))
    case S3Location(
          "fulfilment-date-calculator-dev",
          "Newspaper - Digital Voucher/2020-04-27_Newspaper - Digital Voucher.json",
        ) =>
      Try(
        Source.fromResource("fulfilmentdatefiles/2020-04-27_Newspaper - Digital Voucher.json").getLines().mkString("\n"),
      )
  }

  "StartDateFromFulfilmentFiles" should "get start dates for guardian weekly" in {
    testStartDate(ProductType.GuardianWeekly, List(DayOfWeek.FRIDAY), LocalDate.of(2020, 5, 8))
  }

  "StartDateFromFulfilmentFiles" should "get start dates for home delivery" in {
    testStartDate(
      ProductType.NewspaperHomeDelivery,
      List(MONDAY, TUESDAY, WEDNESDAY, THURSDAY, FRIDAY, SATURDAY, SUNDAY),
      LocalDate.of(2020, 4, 29),
    )
    testStartDate(
      ProductType.NewspaperHomeDelivery,
      List(MONDAY, TUESDAY, WEDNESDAY, THURSDAY, FRIDAY, SATURDAY),
      LocalDate.of(2020, 4, 29),
    )
    testStartDate(
      ProductType.NewspaperHomeDelivery,
      List(SATURDAY, SUNDAY),
      LocalDate.of(2020, 5, 2),
    )
    testStartDate(
      ProductType.NewspaperHomeDelivery,
      List(SUNDAY),
      LocalDate.of(2020, 5, 3),
    )
  }

  it should "get start dates for vouchers " in {
    testStartDate(
      ProductType.NewspaperVoucherBook,
      List(MONDAY, TUESDAY, WEDNESDAY, THURSDAY, FRIDAY, SATURDAY, SUNDAY),
      LocalDate.of(2020, 5, 18),
    )
    testStartDate(
      ProductType.NewspaperVoucherBook,
      List(MONDAY, TUESDAY, WEDNESDAY, THURSDAY, FRIDAY, SATURDAY),
      LocalDate.of(2020, 5, 18),
    )
    testStartDate(
      ProductType.NewspaperVoucherBook,
      List(SATURDAY, SUNDAY),
      LocalDate.of(2020, 5, 23),
    )
    testStartDate(
      ProductType.NewspaperVoucherBook,
      List(SUNDAY),
      LocalDate.of(2020, 5, 24),
    )
  }
  it should "get start dates for digital vouchers " in {
    testStartDate(
      ProductType.NewspaperDigitalVoucher,
      List(MONDAY, TUESDAY, WEDNESDAY, THURSDAY, FRIDAY, SATURDAY, SUNDAY),
      LocalDate.of(2020, 6, 18),
    )
    testStartDate(
      ProductType.NewspaperDigitalVoucher,
      List(MONDAY, TUESDAY, WEDNESDAY, THURSDAY, FRIDAY, SATURDAY),
      LocalDate.of(2020, 6, 18),
    )
    testStartDate(
      ProductType.NewspaperDigitalVoucher,
      List(SATURDAY, SUNDAY),
      LocalDate.of(2020, 6, 23),
    )
    testStartDate(
      ProductType.NewspaperDigitalVoucher,
      List(SUNDAY),
      LocalDate.of(2020, 6, 24),
    )
  }

  private def testStartDate(productType: ProductType, issueDayOfWeek: List[DayOfWeek], expectedStartDate: LocalDate) = {
    Inside.inside(StartDateFromFulfilmentFiles(Stage("DEV"), stubFetchString, LocalDate.of(2020, 4, 27))) {
      case Right(startDateCaclulationFunction) =>
        startDateCaclulationFunction(productType, issueDayOfWeek) should equal(expectedStartDate)
    }
  }
}
