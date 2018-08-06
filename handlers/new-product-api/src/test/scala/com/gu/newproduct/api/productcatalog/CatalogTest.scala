package com.gu.newproduct.api.productcatalog

import org.scalatest.{FlatSpec, Matchers}
import play.api.libs.json.Json

class CatalogTest extends FlatSpec with Matchers {
  it should "serialise catalog" in {

    val everyDayWindowRules = SelectableWindow(
      cutOffDayInclusive = Some(Tuesday),
      startDaysAfterCutOff = Some(20),
      sizeInDays = Some(28)
    )
    val everyDayRules = StartDateRules(
      daysOfWeek = Some(List(Monday)),
      selectableWindow = Some(everyDayWindowRules)
    )

    val voucherEveryday = PlanInfo(
      id = "voucher_everyday",
      label = "Every day",
      startDateRules = Some(everyDayRules)
    )

    val weekendsRule = everyDayRules.copy(
      daysOfWeek = Some(List(Saturday, Sunday))
    )
    val voucherWeekend = PlanInfo(
      id = "voucher_weekend",
      label = "Weekend",
      startDateRules = Some(weekendsRule)
    )

    val monthlyContribution = PlanInfo(
      id = "monthly_contribution",
      label = "Monthly"
    )

    val voucherPlans = Product("Voucher", List(voucherWeekend, voucherEveryday))
    val contributionPlans = Product("Contribution", List(monthlyContribution))
    val catalog = Catalog(List(voucherPlans, contributionPlans))
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
    Json.toJson(catalog) shouldBe Json.parse(expected)

  }
}
