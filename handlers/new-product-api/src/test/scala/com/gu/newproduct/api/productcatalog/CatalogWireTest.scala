package com.gu.newproduct.api.productcatalog

import java.time.DayOfWeek._
import java.time.{DayOfWeek, LocalDate}
import com.gu.newproduct.api.addsubscription.validation._
import com.gu.newproduct.api.productcatalog.WireModel._
import org.scalatest.{FlatSpec, Matchers}
import play.api.libs.json.Json

import scala.com.gu.newproduct.api.productcatalog.{Catalog, Plan, PlanId}

class CatalogWireTest extends FlatSpec with Matchers {
  it should "serialise wire catalog" in {
    val testWireCatalog = TestData.testWireCatalog
    val expected =
      """
        |{
        |"products": [{
        |    "label": "Voucher",
        |    "plans": [{
        |            "id": "voucher_weekend",
        |            "label": "Weekend",
        |            "startDateRules" : {
        |            "selectableWindow" : {
        |              "cutOffDayInclusive": "Tuesday",
        |              "startDaysAfterCutOff" : 20,
        |              "sizeInDays" : 28
        |              },
        |            "daysOfWeek": ["Saturday", "Sunday"]
        |            }
        |        },
        |        {
        |            "id": "voucher_everyday",
        |            "label": "Every day",
        |             "startDateRules" : {
        |             "selectableWindow" : {
        |                "cutOffDayInclusive": "Tuesday",
        |                "startDaysAfterCutOff" : 20,
        |                "sizeInDays" : 28
        |                },
        |             "daysOfWeek": ["Monday"]
        |            }
        |        }
        |    ]
        |}, {
        |    "label": "Contribution",
        |    "plans": [{
        |        "id": "monthly_contribution",
        |        "label": "Monthly"
        |    }]
        |}]
        |}
      """.stripMargin
    Json.toJson(testWireCatalog) shouldBe Json.parse(expected)

  }

  it should "convert catalog to wire catalog" in {
    val fakeDate = () => LocalDate.of(2018, 8, 6)
    val testCatalog = TestData.getTestCatalog(fakeDate)

    WireCatalog.fromCatalog(testCatalog) shouldBe TestData.testWireCatalog
  }
}

object TestData {

  val testWireCatalog = {

    val everyDayWindowRules = WireSelectableWindow(
      cutOffDayInclusive = Some(Tuesday),
      startDaysAfterCutOff = Some(20),
      sizeInDays = Some(28)
    )
    val everyDayRules = WireStartDateRules(
      daysOfWeek = Some(List(Monday)),
      selectableWindow = Some(everyDayWindowRules)
    )

    val voucherEveryday = WirePlanInfo(
      id = "voucher_everyday",
      label = "Every day",
      startDateRules = Some(everyDayRules)
    )

    val weekendsRule = everyDayRules.copy(
      daysOfWeek = Some(List(Saturday, Sunday))
    )
    val voucherWeekend = WirePlanInfo(
      id = "voucher_weekend",
      label = "Weekend",
      startDateRules = Some(weekendsRule)
    )

    val monthlyContribution = WirePlanInfo(
      id = "monthly_contribution",
      label = "Monthly"
    )

    val voucherGroup = WireProduct("Voucher", List(voucherWeekend, voucherEveryday))
    val contributionGroup = WireProduct("Contribution", List(monthlyContribution))
    WireCatalog(List(voucherGroup, contributionGroup))
  }

  def getTestCatalog(fakeDate: () => LocalDate) = {
    val voucherWindowRule = WindowRule(
      now = fakeDate,
      cutOffDay = Some(DayOfWeek.TUESDAY),
      startDelay = Some(Days(20)),
      size = Some(Days(28))
    )
    val weekendRule = DaysOfWeekRule(List(SATURDAY, SUNDAY))
    val tuesdayRule = DaysOfWeekRule(List(MONDAY))
    val voucherWeekendRule = StartDateRules(Some(weekendRule), Some(voucherWindowRule))
    val voucherWeekend = Plan(PlanId("voucher_weekend"), voucherWeekendRule)
    val voucherEveryDayRule = StartDateRules(Some(tuesdayRule), Some(voucherWindowRule))
    val voucherEveryDay = Plan(PlanId("voucher_everyday"), voucherEveryDayRule)

    val monthlyContribution = Plan(PlanId("monthly_contribution"))

    Catalog(
      voucherWeekend = voucherWeekend,
      voucherEveryDay = voucherEveryDay,
      monthlyContribution = monthlyContribution
    )
  }
}
