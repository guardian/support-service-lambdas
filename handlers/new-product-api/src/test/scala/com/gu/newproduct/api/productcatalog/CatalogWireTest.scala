package com.gu.newproduct.api.productcatalog

import java.time.DayOfWeek._
import java.time.{DayOfWeek, LocalDate}
import com.gu.i18n.Currency
import com.gu.newproduct.ResourceLoader
import com.gu.newproduct.api.productcatalog.PlanId._
import com.gu.newproduct.api.productcatalog.WireModel._
import org.scalatest.flatspec.AnyFlatSpec
import org.scalatest.matchers.should.Matchers
import play.api.libs.json.Json

import java.net.URL
import scala.io.Source
import scala.util.Try

class CatalogWireTest extends AnyFlatSpec with Matchers with ResourceLoader {

  val today = LocalDate.of(2019, 12, 1)

  it should "serialise catalog without national delivery" in {

    val expected = getResource("catalogWireTest.json")

    val wireCatalog = WireCatalog.fromCatalog(
      NewProductApi.catalog(fakePricesFor, stubGetFirstAvailableStartDate, today),
      nationalDeliveryEnabled = false,
    )

    Json.prettyPrint(Json.toJson(wireCatalog)) shouldBe Json.prettyPrint(Json.parse(expected.get))
  }

  it should "serialise catalog with national delivery" in {

    val expected = getResource("catalogWireTest-nationalDelivery.json")

    val wireCatalog = WireCatalog.fromCatalog(
      NewProductApi.catalog(fakePricesFor, stubGetFirstAvailableStartDate, today),
      nationalDeliveryEnabled = true,
    )

    Json.prettyPrint(Json.toJson(wireCatalog)) shouldBe Json.prettyPrint(Json.parse(expected.get))
  }

  def gbpPrice(amount: Int): Map[Currency, AmountMinorUnits] = Map(
    Currency.GBP -> AmountMinorUnits(amount),
  )

  def fakePricesFor(planId: PlanId): Map[Currency, AmountMinorUnits] = planId match {
    case VoucherWeekendPlus => gbpPrice(2942)
    case VoucherWeekend => gbpPrice(2076)
    case VoucherSunday => gbpPrice(1079)
    case VoucherSundayPlus => gbpPrice(2206)
    case VoucherSaturday => gbpPrice(1036)
    case VoucherSaturdayPlus => gbpPrice(2162)
    case VoucherEveryDay => gbpPrice(4762)
    case VoucherEveryDayPlus => gbpPrice(5196)
    case VoucherSixDay => gbpPrice(4112)
    case VoucherSixDayPlus => gbpPrice(4762)
    case MonthlySupporterPlus => Map.empty
    case AnnualSupporterPlus => Map.empty
    case MonthlyContribution => Map.empty
    case AnnualContribution => Map.empty
    case HomeDeliveryEveryDay => gbpPrice(123)
    case HomeDeliverySaturday => gbpPrice(456)
    case HomeDeliverySunday => gbpPrice(321)
    case HomeDeliverySixDay => gbpPrice(777)
    case HomeDeliveryWeekend => gbpPrice(888)
    case HomeDeliveryEveryDayPlus => gbpPrice(999)
    case HomeDeliverySaturdayPlus => gbpPrice(678)
    case HomeDeliverySundayPlus => gbpPrice(1010)
    case HomeDeliverySixDayPlus => gbpPrice(1111)
    case HomeDeliveryWeekendPlus => gbpPrice(2222)
    case DigipackMonthly =>
      Map(
        Currency.GBP -> AmountMinorUnits(5555),
        Currency.USD -> AmountMinorUnits(5554),
      )
    case DigipackAnnual =>
      Map(
        Currency.GBP -> AmountMinorUnits(66666),
        Currency.USD -> AmountMinorUnits(66665),
      )
    case GuardianWeeklyDomestic6for6 =>
      Map(
        Currency.GBP -> AmountMinorUnits(1111111),
        Currency.USD -> AmountMinorUnits(11111111),
      )
    case GuardianWeeklyDomesticQuarterly =>
      Map(
        Currency.GBP -> AmountMinorUnits(2222222),
        Currency.USD -> AmountMinorUnits(22222222),
      )
    case GuardianWeeklyDomesticAnnual =>
      Map(
        Currency.GBP -> AmountMinorUnits(3333333),
        Currency.USD -> AmountMinorUnits(33333333),
      )
    case GuardianWeeklyROW6for6 =>
      Map(
        Currency.GBP -> AmountMinorUnits(4444444),
        Currency.USD -> AmountMinorUnits(44444444),
      )
    case GuardianWeeklyROWQuarterly =>
      Map(
        Currency.GBP -> AmountMinorUnits(5555555),
        Currency.USD -> AmountMinorUnits(55555555),
      )
    case GuardianWeeklyROWAnnual =>
      Map(
        Currency.GBP -> AmountMinorUnits(6666666),
        Currency.USD -> AmountMinorUnits(66666666),
      )
    case DigitalVoucherEveryday => gbpPrice(7001)
    case DigitalVoucherEverydayPlus => gbpPrice(7002)
    case DigitalVoucherSixday => gbpPrice(7003)
    case DigitalVoucherSixdayPlus => gbpPrice(7004)
    case DigitalVoucherWeekend => gbpPrice(7005)
    case DigitalVoucherWeekendPlus => gbpPrice(7006)
    case DigitalVoucherSaturday => gbpPrice(7007)
    case DigitalVoucherSaturdayPlus => gbpPrice(7008)
    case DigitalVoucherSunday => gbpPrice(7009)
    case DigitalVoucherSundayPlus => gbpPrice(7010)
    case NationalDeliveryEveryday => gbpPrice(7100)
    case NationalDeliverySixday => gbpPrice(7101)
    case NationalDeliveryWeekend => gbpPrice(7102)
  }

  def stubGetFirstAvailableStartDate(productType: ProductType, daysOfWeek: List[DayOfWeek]) = {
    (productType, daysOfWeek) match {
      case (ProductType.GuardianWeekly, List(FRIDAY)) =>
        LocalDate.of(2020, 1, 1)
      case (
        ProductType.NewspaperHomeDelivery,
        List(MONDAY, TUESDAY, WEDNESDAY, THURSDAY, FRIDAY, SATURDAY, SUNDAY),
        ) =>
        LocalDate.of(2020, 2, 1)
      case (ProductType.NewspaperHomeDelivery, List(MONDAY, TUESDAY, WEDNESDAY, THURSDAY, FRIDAY, SATURDAY)) =>
        LocalDate.of(2020, 2, 2)
      case (ProductType.NewspaperHomeDelivery, List(SATURDAY)) =>
        LocalDate.of(2020, 2, 3)
      case (ProductType.NewspaperHomeDelivery, List(SUNDAY)) =>
        LocalDate.of(2020, 2, 4)
      case (ProductType.NewspaperHomeDelivery, List(SATURDAY, SUNDAY)) =>
        LocalDate.of(2020, 2, 5)
      case (ProductType.NewspaperVoucherBook, List(MONDAY)) =>
        LocalDate.of(2020, 3, 1)
      case (ProductType.NewspaperVoucherBook, List(SATURDAY)) =>
        LocalDate.of(2020, 3, 2)
      case (ProductType.NewspaperVoucherBook, List(SUNDAY)) =>
        LocalDate.of(2020, 3, 3)
      case (
        ProductType.NewspaperDigitalVoucher,
        List(MONDAY, TUESDAY, WEDNESDAY, THURSDAY, FRIDAY, SATURDAY, SUNDAY),
        ) =>
        LocalDate.of(2020, 4, 1)
      case (ProductType.NewspaperDigitalVoucher, List(MONDAY, TUESDAY, WEDNESDAY, THURSDAY, FRIDAY, SATURDAY)) =>
        LocalDate.of(2020, 4, 2)
      case (ProductType.NewspaperDigitalVoucher, List(SATURDAY, SUNDAY)) =>
        LocalDate.of(2020, 4, 3)
      case (ProductType.NewspaperDigitalVoucher, List(SATURDAY)) =>
        LocalDate.of(2020, 4, 4)
      case (ProductType.NewspaperDigitalVoucher, List(SUNDAY)) =>
        LocalDate.of(2020, 4, 5)
      case (
        ProductType.NewspaperNationalDelivery,
        List(MONDAY, TUESDAY, WEDNESDAY, THURSDAY, FRIDAY, SATURDAY, SUNDAY),
        ) =>
        LocalDate.of(2020, 4, 1)
      case (ProductType.NewspaperNationalDelivery, List(MONDAY, TUESDAY, WEDNESDAY, THURSDAY, FRIDAY, SATURDAY)) =>
        LocalDate.of(2020, 4, 2)
      case (ProductType.NewspaperNationalDelivery, List(SATURDAY, SUNDAY)) =>
        LocalDate.of(2020, 4, 3)
    }
  }

}
