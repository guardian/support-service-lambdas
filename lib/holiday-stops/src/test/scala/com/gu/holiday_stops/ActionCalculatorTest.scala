package com.gu.holiday_stops

import java.time.{DayOfWeek, LocalDate}

import com.gu.holiday_stops.ActionCalculator.SuspensionConstants
import com.gu.holiday_stops.ProductVariant._
import org.scalatest.Inside.inside
import org.scalatest.{EitherValues, FlatSpec, Matchers}

class ActionCalculatorTest extends FlatSpec with Matchers with EitherValues {

  type Today = LocalDate
  type FirstAvailableDate = LocalDate

  it should "convert ProductVariant to a set of constants for that product variant" in {

    inside(ActionCalculator.suspensionConstantsByProductVariant(GuardianWeekly)) {
      case Right(SuspensionConstants(annualIssueLimit, List(issues))) =>
        annualIssueLimit shouldEqual 6
        issues.issueDayOfWeek shouldEqual DayOfWeek.FRIDAY
        issues.processorRunLeadTimeDays shouldEqual 9
    }

  }

  it should "calculate first available date for Guardian Weekly" in {

    case class TestDateRange(today: Today, expectedFirstAvailableDate: FirstAvailableDate, comment: String)

    val gwTodayToFirstAvailableDate = List(
      TestDateRange(LocalDate.of(2019, 6, 1), LocalDate.of(2019, 6, 8), "On a Saturday first available on next Sat"),
      TestDateRange(LocalDate.of(2019, 6, 2), LocalDate.of(2019, 6, 8), "On a Sunday, first available on Sat"),
      TestDateRange(LocalDate.of(2019, 6, 3), LocalDate.of(2019, 6, 8), "On a Monday, first available on Sat"),
      TestDateRange(LocalDate.of(2019, 6, 4), LocalDate.of(2019, 6, 8), "On a Tuesday, first available on Sat"),
      TestDateRange(LocalDate.of(2019, 6, 5), LocalDate.of(2019, 6, 15), "On a Wednesday, first available jumps to following Sat"),
      TestDateRange(LocalDate.of(2019, 6, 6), LocalDate.of(2019, 6, 15), "On a Thursday, first available on Sat"),
      TestDateRange(LocalDate.of(2019, 6, 7), LocalDate.of(2019, 6, 15), "On a Friday, first available on Sat"),
      TestDateRange(LocalDate.of(2019, 6, 8), LocalDate.of(2019, 6, 15), "On a Saturday, first available on next Sat"),
      TestDateRange(LocalDate.of(2019, 6, 9), LocalDate.of(2019, 6, 15), "On a Sunday, first available on Sat"),
      TestDateRange(LocalDate.of(2019, 6, 10), LocalDate.of(2019, 6, 15), "On a Monday, first available on Sat"),
      TestDateRange(LocalDate.of(2019, 6, 11), LocalDate.of(2019, 6, 15), "On a Tuesday, first available on Sat"),
      TestDateRange(LocalDate.of(2019, 6, 12), LocalDate.of(2019, 6, 22), "On a Wednesday, first available jumps to following Sat"),
      TestDateRange(LocalDate.of(2019, 6, 13), LocalDate.of(2019, 6, 22), "On a Thursday, first available on Sat"),
      TestDateRange(LocalDate.of(2019, 6, 14), LocalDate.of(2019, 6, 22), "On a Friday, first available on Sat"),
      TestDateRange(LocalDate.of(2019, 6, 15), LocalDate.of(2019, 6, 22), "On a Saturday first available on next Sat"),
      TestDateRange(LocalDate.of(2019, 6, 16), LocalDate.of(2019, 6, 22), "On a Sunday, first available on Sat"),
      TestDateRange(LocalDate.of(2019, 6, 17), LocalDate.of(2019, 6, 22), "On a Monday, first available on Sat"),
      TestDateRange(LocalDate.of(2019, 6, 18), LocalDate.of(2019, 6, 22), "On a Tuesday, first available on Sat"),
      TestDateRange(LocalDate.of(2019, 6, 19), LocalDate.of(2019, 6, 29), "On a Wednesday, first available jumps to following Sat"),
      TestDateRange(LocalDate.of(2019, 6, 20), LocalDate.of(2019, 6, 29), "On a Thursday, first available on Sat"),
      TestDateRange(LocalDate.of(2019, 6, 21), LocalDate.of(2019, 6, 29), "On a Friday, first available on Sat"),
      TestDateRange(LocalDate.of(2019, 6, 22), LocalDate.of(2019, 6, 29), "On a Saturday first available on next Sat"),
      TestDateRange(LocalDate.of(2019, 6, 23), LocalDate.of(2019, 6, 29), "On a Sunday, first available on Sat"),
      TestDateRange(LocalDate.of(2019, 6, 24), LocalDate.of(2019, 6, 29), "On a Monday, first available on Sat"),
      TestDateRange(LocalDate.of(2019, 6, 25), LocalDate.of(2019, 6, 29), "On a Tuesday, first available on Sat"),
      TestDateRange(LocalDate.of(2019, 6, 26), LocalDate.of(2019, 7, 6), "On a Wednesday, first available jumps to following Sat"),
      TestDateRange(LocalDate.of(2019, 6, 27), LocalDate.of(2019, 7, 6), "On a Thursday, first available on Sat"),
      TestDateRange(LocalDate.of(2019, 6, 28), LocalDate.of(2019, 7, 6), "On a Friday, first available on Sat"),
      TestDateRange(LocalDate.of(2019, 6, 29), LocalDate.of(2019, 7, 6), "On a Saturday first available on next Sat"),
      TestDateRange(LocalDate.of(2019, 6, 30), LocalDate.of(2019, 7, 6), "On a Sunday, first available on Sat"),
      TestDateRange(LocalDate.of(2019, 7, 1), LocalDate.of(2019, 7, 6), "On a Monday, first available on Sat"),
      TestDateRange(LocalDate.of(2019, 7, 2), LocalDate.of(2019, 7, 6), "On a Tuesday, first available on Sat"),
      TestDateRange(LocalDate.of(2019, 7, 3), LocalDate.of(2019, 7, 13), "On a Wednesday, first available jumps to following Sat")
    )
    val subscription = Fixtures.mkGuardianWeeklySubscription(customerAcceptanceDate = LocalDate.of(2018, 6, 1))

    gwTodayToFirstAvailableDate foreach {
      case TestDateRange(today, expected, comment) =>
        inside(ActionCalculator
          .getProductSpecificsByProductVariant(
            GuardianWeekly,
            subscription,
            today
          )) {
          case Right(ProductSpecifics(_, List(issueSpecifics))) =>
            withClue(s"Expected: $comment.  Problem was ") { issueSpecifics.firstAvailableDate shouldEqual expected }
        }
    }
  }
  it should "calculate first available date for Sunday Voucher" in {
    val acceptanceDateInThePast = LocalDate.of(2019, 1, 1)
    inside(
      ActionCalculator
        .getProductSpecificsByProductVariant(
          SundayVoucher,
          Fixtures.mkGuardianWeeklySubscription(customerAcceptanceDate = acceptanceDateInThePast),
          LocalDate.of(2019, 9, 9)
        )
    ) {
        case Right(ProductSpecifics(_, List(issueSpecifics))) =>
          issueSpecifics.firstAvailableDate shouldEqual LocalDate.of(2019, 9, 10)
      }
  }
  it should "calculate first available date when 'first fulfilment date' is significantly in the future" in {
    val customerAcceptanceDate = LocalDate.of(2018, 6, 10)
    inside(
      ActionCalculator
        .getProductSpecificsByProductVariant(
          SundayVoucher,
          Fixtures.mkGuardianWeeklySubscription(customerAcceptanceDate = customerAcceptanceDate),
          today = LocalDate.of(2018, 5, 1)
        )
    ) {
        case Right(ProductSpecifics(_, List(issueSpecifics))) =>
          issueSpecifics.firstAvailableDate shouldEqual customerAcceptanceDate
      }
  }
}
