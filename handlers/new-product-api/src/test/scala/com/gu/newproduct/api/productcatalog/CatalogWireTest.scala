package com.gu.newproduct.api.productcatalog

import com.gu.newproduct.api.addsubscription.AmountMinorUnits
import com.gu.newproduct.api.productcatalog.PlanId._
import com.gu.newproduct.api.productcatalog.WireModel._
import org.scalatest.{FlatSpec, Matchers}
import play.api.libs.json.Json

class CatalogWireTest extends FlatSpec with Matchers {
  it should "serialise catalog" in {
    val expected =
      """
        |{
        |  "products": [
        |    {
        |      "label": "Contribution",
        |      "plans": [
        |        {
        |          "id": "monthly_contribution",
        |          "label": "Monthly",
        |          "startDateRules": {
        |            "selectableWindow": {
        |              "sizeInDays": 1
        |            }
        |          }
        |        }
        |      ]
        |    },
        |    {
        |      "label": "Voucher",
        |      "plans": [
        |        {
        |          "id": "voucher_everyday",
        |          "label": "Every day",
        |          "startDateRules": {
        |            "daysOfWeek": [
        |              "Monday"
        |            ],
        |            "selectableWindow": {
        |              "cutOffDayInclusive": "Tuesday",
        |              "startDaysAfterCutOff": 20,
        |              "sizeInDays": 28
        |            }
        |          },
        |          "paymentPlan": "GBP 47.62 every month"
        |        },
        |        {
        |          "id": "voucher_everyday_plus",
        |          "label": "Every day+",
        |          "startDateRules": {
        |            "daysOfWeek": [
        |              "Monday"
        |            ],
        |            "selectableWindow": {
        |              "cutOffDayInclusive": "Tuesday",
        |              "startDaysAfterCutOff": 20,
        |              "sizeInDays": 28
        |            }
        |          },
        |          "paymentPlan": "GBP 51.96 every month"
        |        },
        |        {
        |          "id": "voucher_saturday",
        |          "label": "Saturday",
        |          "startDateRules": {
        |            "daysOfWeek": [
        |              "Saturday"
        |            ],
        |            "selectableWindow": {
        |              "cutOffDayInclusive": "Tuesday",
        |              "startDaysAfterCutOff": 20,
        |              "sizeInDays": 28
        |            }
        |          },
        |          "paymentPlan": "GBP 10.36 every month"
        |        },
        |        {
        |          "id": "voucher_saturday_plus",
        |          "label": "Saturday+",
        |          "startDateRules": {
        |            "daysOfWeek": [
        |              "Saturday"
        |            ],
        |            "selectableWindow": {
        |              "cutOffDayInclusive": "Tuesday",
        |              "startDaysAfterCutOff": 20,
        |              "sizeInDays": 28
        |            }
        |          },
        |          "paymentPlan": "GBP 21.62 every month"
        |        },
        |        {
        |          "id": "voucher_sixday",
        |          "label": "Six day",
        |          "startDateRules": {
        |            "daysOfWeek": [
        |              "Monday"
        |            ],
        |            "selectableWindow": {
        |              "cutOffDayInclusive": "Tuesday",
        |              "startDaysAfterCutOff": 20,
        |              "sizeInDays": 28
        |            }
        |          },
        |          "paymentPlan": "GBP 41.12 every month"
        |        },
        |        {
        |          "id": "voucher_sixday_plus",
        |          "label": "Six day+",
        |          "startDateRules": {
        |            "daysOfWeek": [
        |              "Monday"
        |            ],
        |            "selectableWindow": {
        |              "cutOffDayInclusive": "Tuesday",
        |              "startDaysAfterCutOff": 20,
        |              "sizeInDays": 28
        |            }
        |          },
        |          "paymentPlan": "GBP 47.62 every month"
        |        },
        |        {
        |          "id": "voucher_sunday",
        |          "label": "Sunday",
        |          "startDateRules": {
        |            "daysOfWeek": [
        |              "Sunday"
        |            ],
        |            "selectableWindow": {
        |              "cutOffDayInclusive": "Tuesday",
        |              "startDaysAfterCutOff": 20,
        |              "sizeInDays": 28
        |            }
        |          },
        |          "paymentPlan": "GBP 10.79 every month"
        |        },
        |        {
        |          "id": "voucher_sunday_plus",
        |          "label": "Sunday+",
        |          "startDateRules": {
        |            "daysOfWeek": [
        |              "Sunday"
        |            ],
        |            "selectableWindow": {
        |              "cutOffDayInclusive": "Tuesday",
        |              "startDaysAfterCutOff": 20,
        |              "sizeInDays": 28
        |            }
        |          },
        |          "paymentPlan": "GBP 22.06 every month"
        |        },
        |        {
        |          "id": "voucher_weekend",
        |          "label": "Weekend",
        |          "startDateRules": {
        |            "daysOfWeek": [
        |              "Saturday"
        |            ],
        |            "selectableWindow": {
        |              "cutOffDayInclusive": "Tuesday",
        |              "startDaysAfterCutOff": 20,
        |              "sizeInDays": 28
        |            }
        |          },
        |          "paymentPlan": "GBP 20.76 every month"
        |        },
        |        {
        |          "id": "voucher_weekend_plus",
        |          "label": "Weekend+",
        |          "startDateRules": {
        |            "daysOfWeek": [
        |              "Saturday"
        |            ],
        |            "selectableWindow": {
        |              "cutOffDayInclusive": "Tuesday",
        |              "startDaysAfterCutOff": 20,
        |              "sizeInDays": 28
        |            }
        |          },
        |          "paymentPlan": "GBP 29.42 every month"
        |        }
        |      ]
        |    }
        |  ]
        |}
      """.stripMargin

    def fakePricesFor(planId: PlanId): Option[AmountMinorUnits] = planId match {
      case VoucherWeekendPlus => Some(AmountMinorUnits(2942))
      case VoucherWeekend => Some(AmountMinorUnits(2076))
      case VoucherSunday => Some(AmountMinorUnits(1079))
      case VoucherSundayPlus => Some(AmountMinorUnits(2206))
      case VoucherSaturday => Some(AmountMinorUnits(1036))
      case VoucherSaturdayPlus => Some(AmountMinorUnits(2162))
      case VoucherEveryDay => Some(AmountMinorUnits(4762))
      case VoucherEveryDayPlus => Some(AmountMinorUnits(5196))
      case VoucherSixDay => Some(AmountMinorUnits(4112))
      case VoucherSixDayPlus => Some(AmountMinorUnits(4762))
      case MonthlyContribution => None
    }

    val wireCatalog = WireCatalog.fromCatalog(NewProductApi.catalog, fakePricesFor)
    Json.toJson(wireCatalog) shouldBe Json.parse(expected)
  }
}

