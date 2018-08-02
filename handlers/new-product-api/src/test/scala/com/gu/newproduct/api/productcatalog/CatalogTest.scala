package com.gu.newproduct.api.productcatalog

import org.scalatest.{FlatSpec, Matchers}
import play.api.libs.json.Json

class CatalogTest extends FlatSpec with Matchers {
  it should "serialise catalog" in {

    val everyDayRules = StartDateRules(
      cutOffDay = Some(Wednesday),
      daysOfWeek = Some(List(Monday)),
      minDelay = Some(21),
      maxDelay = Some(49)
    )

    val voucherEveryday = ProductInfo(
      id = "voucher_everyday",
      label = "Every day",
      startDateRules = Some(everyDayRules)
    )

    val weekendsRule = everyDayRules.copy(
      daysOfWeek = Some(List(Saturday, Sunday))
    )
    val voucherWeekend = ProductInfo(
      id = "voucher_weekend",
      label = "Weekend",
      startDateRules = Some(weekendsRule)
    )

    val monthlyContribution = ProductInfo(
      id = "monthly_contribution",
      label = "Monthly"
    )

    val voucherGroup = Group("Voucher", List(voucherWeekend, voucherEveryday))
    val contributionGroup = Group("Contribution", List(monthlyContribution))
    val catalog = Catalog(List(voucherGroup, contributionGroup))
    val expected =
      """
        |{
        |"groups": [{
        |    "label": "Voucher",
        |    "products": [{
        |            "id": "voucher_weekend",
        |            "label": "Weekend",
        |            "startDateRules" : {
        |            "cutOffDay": "Wednesday",
        |            "minDelay" : 21,
        |            "maxDelay" : 49,
        |            "daysOfWeek": ["Saturday", "Sunday"]
        |            }
        |        },
        |        {
        |            "id": "voucher_everyday",
        |            "label": "Every day",
        |             "startDateRules" : {
        |            "cutOffDay": "Wednesday",
        |            "minDelay" : 21,
        |            "maxDelay" : 49,
        |            "daysOfWeek": ["Monday"]
        |            }
        |        }
        |    ]
        |}, {
        |    "label": "Contribution",
        |    "products": [{
        |        "id": "monthly_contribution",
        |        "label": "Monthly"
        |    }]
        |}]
        |}
      """.stripMargin
    Json.toJson(catalog) shouldBe Json.parse(expected)

  }
}
