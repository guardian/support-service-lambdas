package com.gu.holiday_stops

import java.time.{DayOfWeek, LocalDate}

import com.gu.holiday_stops.ActionCalculator.SuspensionConstants
import com.gu.salesforce.holiday_stops.SalesforceHolidayStopRequestsDetail.{ProductName, ProductRatePlanKey, ProductRatePlanName, ProductType}
import org.scalatest.Inside.inside
import org.scalatest.{EitherValues, FlatSpec, Matchers}

import scala.collection.immutable.ListMap
import scala.util.Random

class ActionCalculatorTest extends FlatSpec with Matchers with EitherValues {

  val gwProductName = ProductName("Guardian Weekly Zone A")
  val gwProductType = ProductType("Guardian Weekly")

  val sundayProductRatePlanName = ProductRatePlanName("Sunday")
  val vouchersProductType = ProductType("Newspaper - Voucher Book")

  type Today = LocalDate
  type FirstAvailableDate = LocalDate

  it should "convert ProductName to a set of constants for that product" in {

    inside(ActionCalculator.suspensionConstantsByProduct(gwProductName)) {
      case SuspensionConstants(annualIssueLimit, List(issues)) =>
        annualIssueLimit shouldEqual 6
        issues.issueDayOfWeek shouldEqual DayOfWeek.FRIDAY
        issues.processorRunLeadTimeDays shouldEqual 9
    }

    assertThrows[RuntimeException] {
      ActionCalculator.suspensionConstantsByProduct(ProductName("blah"))
    }
  }

  it should "calculate first available date for Guardian Weekly" in {
    val gwTodayToFirstAvailableDate = ListMap[Today, FirstAvailableDate](
      LocalDate.of(2019, 6, 1) -> LocalDate.of(2019, 6, 8), // first available on Sun
      LocalDate.of(2019, 6, 2) -> LocalDate.of(2019, 6, 8), // first available on Sun
      LocalDate.of(2019, 6, 3) -> LocalDate.of(2019, 6, 8), // first available on Sun
      LocalDate.of(2019, 6, 4) -> LocalDate.of(2019, 6, 15), // jump on Tue, a day before processor run
      LocalDate.of(2019, 6, 5) -> LocalDate.of(2019, 6, 15), // first available on Sun
      LocalDate.of(2019, 6, 6) -> LocalDate.of(2019, 6, 15), // first available on Sun
      LocalDate.of(2019, 6, 7) -> LocalDate.of(2019, 6, 15), // first available on Sun
      LocalDate.of(2019, 6, 8) -> LocalDate.of(2019, 6, 15), // first available on Sun
      LocalDate.of(2019, 6, 9) -> LocalDate.of(2019, 6, 15), // first available on Sun
      LocalDate.of(2019, 6, 10) -> LocalDate.of(2019, 6, 15), // first available on Sun
      LocalDate.of(2019, 6, 11) -> LocalDate.of(2019, 6, 22), // jump on Tue, a day before processor run
      LocalDate.of(2019, 6, 12) -> LocalDate.of(2019, 6, 22), // first available on Sun
      LocalDate.of(2019, 6, 13) -> LocalDate.of(2019, 6, 22), // first available on Sun
      LocalDate.of(2019, 6, 14) -> LocalDate.of(2019, 6, 22), // first available on Sun
      LocalDate.of(2019, 6, 15) -> LocalDate.of(2019, 6, 22), // first available on Sun
      LocalDate.of(2019, 6, 16) -> LocalDate.of(2019, 6, 22), // first available on Sun
      LocalDate.of(2019, 6, 17) -> LocalDate.of(2019, 6, 22), // first available on Sun
      LocalDate.of(2019, 6, 18) -> LocalDate.of(2019, 6, 29), // jump on Tue, a day before processor run
      LocalDate.of(2019, 6, 19) -> LocalDate.of(2019, 6, 29), // first available on Sun
      LocalDate.of(2019, 6, 20) -> LocalDate.of(2019, 6, 29), // first available on Sun
      LocalDate.of(2019, 6, 21) -> LocalDate.of(2019, 6, 29), // first available on Sun
      LocalDate.of(2019, 6, 22) -> LocalDate.of(2019, 6, 29), // first available on Sun
      LocalDate.of(2019, 6, 23) -> LocalDate.of(2019, 6, 29), // first available on Sun
      LocalDate.of(2019, 6, 24) -> LocalDate.of(2019, 6, 29), // first available on Sun
      LocalDate.of(2019, 6, 25) -> LocalDate.of(2019, 7, 6), // jump on Tue, a day before processor run
      LocalDate.of(2019, 6, 26) -> LocalDate.of(2019, 7, 6), // first available on Sun
      LocalDate.of(2019, 6, 27) -> LocalDate.of(2019, 7, 6), // first available on Sun
      LocalDate.of(2019, 6, 28) -> LocalDate.of(2019, 7, 6), // first available on Sun
      LocalDate.of(2019, 6, 29) -> LocalDate.of(2019, 7, 6), // first available on Sun
      LocalDate.of(2019, 6, 30) -> LocalDate.of(2019, 7, 6), // first available on Sun
      LocalDate.of(2019, 7, 1) -> LocalDate.of(2019, 7, 6), // first available on Sun
      LocalDate.of(2019, 7, 2) -> LocalDate.of(2019, 7, 13) // jump on Tue, a day before processor run
    )

    gwTodayToFirstAvailableDate foreach {
      case (today, expected) =>
        ActionCalculator
          .getProductSpecifics(gwProductName, today)
          .firstAvailableDate shouldEqual expected

        inside(ActionCalculator
          .getProductSpecificsByProductRatePlanKey(
            ProductRatePlanKey(gwProductType, ProductRatePlanName(Random.nextString(10))),
            today
          )) {
          case Right(ProductSpecifics(_, List(issueSpecifics))) => issueSpecifics.firstAvailableDate shouldEqual expected
        }
    }
  }

  it should "correctly list the action dates for given Holiday Stop Request" in {

    ActionCalculator.publicationDatesToBeStopped(
      fromInclusive = LocalDate.of(2019, 5, 18),
      toInclusive = LocalDate.of(2019, 6, 20),
      productName = gwProductName
    ) shouldEqual List(
        LocalDate.of(2019, 5, 24),
        LocalDate.of(2019, 5, 31),
        LocalDate.of(2019, 6, 7),
        LocalDate.of(2019, 6, 14)
      )

    ActionCalculator.publicationDatesToBeStopped(
      fromInclusive = LocalDate.of(2019, 5, 18),
      toInclusive = LocalDate.of(2019, 6, 21),
      productName = gwProductName
    ) shouldEqual List(
        LocalDate.of(2019, 5, 24),
        LocalDate.of(2019, 5, 31),
        LocalDate.of(2019, 6, 7),
        LocalDate.of(2019, 6, 14),
        LocalDate.of(2019, 6, 21)
      )
  }
  it should "calculate first available date for Sunday Voucher" in {
    inside(
      ActionCalculator
        .getProductSpecificsByProductRatePlanKey(
          ProductRatePlanKey(vouchersProductType, sundayProductRatePlanName),
          LocalDate.of(2019, 9, 9)
        )
    ) {
        case Right(ProductSpecifics(_, List(issueSpecifics))) =>
          issueSpecifics.firstAvailableDate shouldEqual LocalDate.of(2019, 9, 10)
      }
  }
  it should "correctly list the action dates for Sunday Voucher" in {
    val sundayVoucherProductRatePlanKey =
      ProductRatePlanKey(ProductType("Newspaper - Voucher Book"), ProductRatePlanName("Sunday"))

    ActionCalculator.publicationDatesToBeStopped(
      fromInclusive = LocalDate.of(2019, 5, 20),
      toInclusive = LocalDate.of(2019, 6, 22),
      productRatePlanKey = sundayVoucherProductRatePlanKey
    ) shouldEqual Right(List(
      LocalDate.of(2019, 5, 26),
      LocalDate.of(2019, 6, 2),
      LocalDate.of(2019, 6, 9),
      LocalDate.of(2019, 6, 16)
    ))

    ActionCalculator.publicationDatesToBeStopped(
      fromInclusive = LocalDate.of(2019, 5, 20),
      toInclusive = LocalDate.of(2019, 6, 23),
      productRatePlanKey = sundayVoucherProductRatePlanKey
    ) shouldEqual Right(List(
      LocalDate.of(2019, 5, 26),
      LocalDate.of(2019, 6, 2),
      LocalDate.of(2019, 6, 9),
      LocalDate.of(2019, 6, 16),
      LocalDate.of(2019, 6, 23)
    ))
  }
  it should "return an error for an unsupported product rate plan" in {
    val unsupportedProductRatePlanKey =
      ProductRatePlanKey(ProductType("not supported"), ProductRatePlanName("not supported"))

    ActionCalculator.publicationDatesToBeStopped(
      fromInclusive = LocalDate.of(2019, 5, 20),
      toInclusive = LocalDate.of(2019, 6, 22),
      productRatePlanKey = unsupportedProductRatePlanKey
    ) should be ('left)
  }
}
