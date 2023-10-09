package com.gu.newproduct.api.productcatalog.startdate

import com.gu.effects.S3Location
import com.gu.newproduct.ResourceLoader
import com.gu.newproduct.api.productcatalog.{ProductType, StartDateFromFulfilmentFiles}
import com.gu.util.config.Stage
import org.scalatest.Inside
import org.scalatest.flatspec.AnyFlatSpec
import org.scalatest.matchers.should.Matchers

import java.time.DayOfWeek._
import java.time.{DayOfWeek, LocalDate}
import scala.util.{Failure, Try}

class StartDateFromFulfilmentFilesTest extends AnyFlatSpec with Matchers with ResourceLoader {
  
  def stubFetchString(s3Location: S3Location): Try[String] = {
    if (s3Location.bucket == "fulfilment-date-calculator-code") {
      val resourceName = s3Location.key match {
        case "Guardian Weekly/2020-04-27_Guardian Weekly.json" => "2023-09-14_Guardian Weekly.json"
        case "Newspaper - Home Delivery/2020-04-27_Newspaper - Home Delivery.json" => "2023-09-14_Newspaper - Home Delivery.json"
        case "Newspaper - Voucher Book/2020-04-27_Newspaper - Voucher Book.json" => "2023-09-14_Newspaper - Voucher Book.json"
        case "Newspaper - Digital Voucher/2020-04-27_Newspaper - Digital Voucher.json" => "2023-09-14_Newspaper - Digital Voucher.json"
        case "Newspaper - National Delivery/2020-04-27_Newspaper - National Delivery.json" => "2023-09-14_Newspaper - National Delivery.json"
      }
      getResource(resourceName)
    }
    else Failure(new Throwable("not found"))
  }

  "StartDateFromFulfilmentFiles" should "get start dates for guardian weekly" in {
    testStartDate(ProductType.GuardianWeekly, List(DayOfWeek.FRIDAY), LocalDate.of(2023, 9, 29))
  }

  "StartDateFromFulfilmentFiles" should "get start dates for home delivery" in {
    testStartDate(
      ProductType.NewspaperHomeDelivery,
      List(MONDAY, TUESDAY, WEDNESDAY, THURSDAY, FRIDAY, SATURDAY, SUNDAY),
      LocalDate.of(2023, 9, 20),//next wed (gen fri, need Fri+Mon+Tue to get the papers ready)
    )
    testStartDate(
      ProductType.NewspaperHomeDelivery,
      List(MONDAY, TUESDAY, WEDNESDAY, THURSDAY, FRIDAY, SATURDAY),
      LocalDate.of(2023, 9, 20),
    )
    testStartDate(
      ProductType.NewspaperHomeDelivery,
      List(SATURDAY, SUNDAY),
      LocalDate.of(2023, 9, 23),
    )
    testStartDate(
      ProductType.NewspaperHomeDelivery,
      List(SUNDAY),
      LocalDate.of(2023, 9, 24),
    )
  }

  it should "get start dates for vouchers " in {
    testStartDate(
      ProductType.NewspaperVoucherBook,
      List(MONDAY, TUESDAY, WEDNESDAY, THURSDAY, FRIDAY, SATURDAY, SUNDAY),
      LocalDate.of(2023, 10, 9),
    )
    testStartDate(
      ProductType.NewspaperVoucherBook,
      List(MONDAY, TUESDAY, WEDNESDAY, THURSDAY, FRIDAY, SATURDAY),
      LocalDate.of(2023, 10, 9),
    )
    testStartDate(
      ProductType.NewspaperVoucherBook,
      List(SATURDAY, SUNDAY),
      LocalDate.of(2023, 10, 14),
    )
    testStartDate(
      ProductType.NewspaperVoucherBook,
      List(SUNDAY),
      LocalDate.of(2023, 10, 15),
    )
  }
  it should "get start dates for digital vouchers " in {
    testStartDate(
      ProductType.NewspaperDigitalVoucher,
      List(MONDAY, TUESDAY, WEDNESDAY, THURSDAY, FRIDAY, SATURDAY, SUNDAY),
      LocalDate.of(2023, 9, 25),
    )
    testStartDate(
      ProductType.NewspaperDigitalVoucher,
      List(MONDAY, TUESDAY, WEDNESDAY, THURSDAY, FRIDAY, SATURDAY),
      LocalDate.of(2023, 9, 25),
    )
    testStartDate(
      ProductType.NewspaperDigitalVoucher,
      List(SATURDAY, SUNDAY),
      LocalDate.of(2023, 9, 30),
    )
    testStartDate(
      ProductType.NewspaperDigitalVoucher,
      List(SUNDAY),
      LocalDate.of(2023, 10, 1),
    )
  }

  "StartDateFromFulfilmentFiles" should "get start dates for National delivery" in {
    testStartDate(
      ProductType.NewspaperNationalDelivery,
      List(MONDAY, TUESDAY, WEDNESDAY, THURSDAY, FRIDAY, SATURDAY, SUNDAY),
      LocalDate.of(2023, 9, 19), //next tue (gen fri, need Fri+Mon to get the papers ready)
    )
    testStartDate(
      ProductType.NewspaperNationalDelivery,
      List(MONDAY, TUESDAY, WEDNESDAY, THURSDAY, FRIDAY, SATURDAY),
      LocalDate.of(2023, 9, 19),
    )
    testStartDate(
      ProductType.NewspaperNationalDelivery,
      List(SATURDAY, SUNDAY),
      LocalDate.of(2023, 9, 23),
    )
    testStartDate(
      ProductType.NewspaperNationalDelivery,
      List(SUNDAY),
      LocalDate.of(2023, 9, 24),
    )
  }

  private def testStartDate(productType: ProductType, issueDayOfWeek: List[DayOfWeek], expectedStartDate: LocalDate) = {
    Inside.inside(StartDateFromFulfilmentFiles(Stage("CODE"), stubFetchString, LocalDate.of(2020, 4, 27))) {
      case Right(startDateCaclulationFunction) =>
        startDateCaclulationFunction(productType, issueDayOfWeek) should equal(expectedStartDate)
    }
  }
}
