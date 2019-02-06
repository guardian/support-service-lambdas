package com.gu.newproduct.api.productcatalog

import com.gu.newproduct.api.productcatalog.PlanId._
import com.gu.newproduct.api.productcatalog.WireModel._
import org.scalatest.{FlatSpec, Matchers}
import play.api.libs.json.Json

class CatalogWireTest extends FlatSpec with Matchers {
  it should "serialise catalog" in {
    val expected =
          """
          {
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
     |        },
     |        {
     |          "id": "annual_contribution",
     |          "label": "Annual",
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
     |          "label": "Everyday",
     |          "startDateRules": {
     |            "daysOfWeek": [
     |              "Monday"
     |            ],
     |            "selectableWindow": {
     |              "cutOffDayInclusive": "Tuesday",
     |              "startDaysAfterCutOff": 20,
     |              "sizeInDays": 35
     |            }
     |          },
     |          "paymentPlan": "GBP 47.62 every month"
     |        },
     |        {
     |          "id": "voucher_everyday_plus",
     |          "label": "Everyday+",
     |          "startDateRules": {
     |            "daysOfWeek": [
     |              "Monday"
     |            ],
     |            "selectableWindow": {
     |              "cutOffDayInclusive": "Tuesday",
     |              "startDaysAfterCutOff": 20,
     |              "sizeInDays": 35
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
     |              "sizeInDays": 35
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
     |              "sizeInDays": 35
     |            }
     |          },
     |          "paymentPlan": "GBP 21.62 every month"
     |        },
     |        {
     |          "id": "voucher_sixday",
     |          "label": "Sixday",
     |          "startDateRules": {
     |            "daysOfWeek": [
     |              "Monday"
     |            ],
     |            "selectableWindow": {
     |              "cutOffDayInclusive": "Tuesday",
     |              "startDaysAfterCutOff": 20,
     |              "sizeInDays": 35
     |            }
     |          },
     |          "paymentPlan": "GBP 41.12 every month"
     |        },
     |        {
     |          "id": "voucher_sixday_plus",
     |          "label": "Sixday+",
     |          "startDateRules": {
     |            "daysOfWeek": [
     |              "Monday"
     |            ],
     |            "selectableWindow": {
     |              "cutOffDayInclusive": "Tuesday",
     |              "startDaysAfterCutOff": 20,
     |              "sizeInDays": 35
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
     |              "sizeInDays": 35
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
     |              "sizeInDays": 35
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
     |              "sizeInDays": 35
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
     |              "sizeInDays": 35
     |            }
     |          },
     |          "paymentPlan": "GBP 29.42 every month"
     |        }
     |      ]
     |    },
     |    {
     |      "label": "Home delivery",
     |      "plans": [
     |        {
     |          "id": "home_delivery_everyday",
     |          "label": "Everyday",
     |          "startDateRules": {
     |            "selectableWindow": {
     |              "startDaysAfterCutOff": 3,
     |              "sizeInDays": 28
     |            }
     |          },
     |          "paymentPlan": "GBP 1.23 every month"
     |        },
     |        {
     |          "id": "home_delivery_sixday",
     |          "label": "Sixday",
     |          "startDateRules": {
     |            "daysOfWeek": [
     |              "Monday",
     |              "Tuesday",
     |              "Wednesday",
     |              "Thursday",
     |              "Friday",
     |              "Saturday"
     |            ],
     |            "selectableWindow": {
     |              "startDaysAfterCutOff": 3,
     |              "sizeInDays": 28
     |            }
     |          },
     |          "paymentPlan": "GBP 7.77 every month"
     |        },
     |        {
     |          "id": "home_delivery_sunday",
     |          "label": "Sunday",
     |          "startDateRules": {
     |            "daysOfWeek": [
     |              "Sunday"
     |            ],
     |            "selectableWindow": {
     |              "startDaysAfterCutOff": 3,
     |              "sizeInDays": 28
     |            }
     |          },
     |          "paymentPlan": "GBP 3.21 every month"
     |        },
     |        {
     |          "id": "home_delivery_weekend",
     |          "label": "Weekend",
     |          "startDateRules": {
     |            "daysOfWeek": [
     |              "Saturday",
     |              "Sunday"
     |            ],
     |            "selectableWindow": {
     |              "startDaysAfterCutOff": 3,
     |              "sizeInDays": 28
     |            }
     |          },
     |          "paymentPlan": "GBP 8.88 every month"
     |        },
     |        {
     |          "id": "home_delivery_everyday_plus",
     |          "label": "Everyday+",
     |          "startDateRules": {
     |            "selectableWindow": {
     |              "startDaysAfterCutOff": 3,
     |              "sizeInDays": 28
     |            }
     |          },
     |          "paymentPlan": "GBP 9.99 every month"
     |        },
     |        {
     |          "id": "home_delivery_sixday_plus",
     |          "label": "Sixday+",
     |          "startDateRules": {
     |            "daysOfWeek": [
     |              "Monday",
     |              "Tuesday",
     |              "Wednesday",
     |              "Thursday",
     |              "Friday",
     |              "Saturday"
     |            ],
     |            "selectableWindow": {
     |              "startDaysAfterCutOff": 3,
     |              "sizeInDays": 28
     |            }
     |          },
     |          "paymentPlan": "GBP 11.11 every month"
     |        },
     |        {
     |          "id": "home_delivery_sunday_plus",
     |          "label": "Sunday+",
     |          "startDateRules": {
     |            "daysOfWeek": [
     |              "Sunday"
     |            ],
     |            "selectableWindow": {
     |              "startDaysAfterCutOff": 3,
     |              "sizeInDays": 28
     |            }
     |          },
     |          "paymentPlan": "GBP 10.10 every month"
     |        },
     |        {
     |          "id": "home_delivery_sunday_plus",
     |          "label": "Sunday+",
     |          "startDateRules": {
     |            "daysOfWeek": [
     |              "Sunday"
     |            ],
     |            "selectableWindow": {
     |              "startDaysAfterCutOff": 3,
     |              "sizeInDays": 28
     |            }
     |          },
     |          "paymentPlan": "GBP 10.10 every month"
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
      case AnnualContribution => None
      case HomeDeliveryEveryDay => Some(AmountMinorUnits(123))
      case HomeDeliverySunday => Some(AmountMinorUnits(321))
      case HomeDeliverySixDay => Some(AmountMinorUnits(777))
      case HomeDeliveryWeekend => Some(AmountMinorUnits(888))
      case HomeDeliveryEveryDayPlus => Some(AmountMinorUnits(999))
      case HomeDeliverySundayPlus => Some(AmountMinorUnits(1010))
      case HomeDeliverySixDayPlus => Some(AmountMinorUnits(1111))
      case HomeDeliveryWeekendPlus => Some(AmountMinorUnits(2222))
    }

    val wireCatalog = WireCatalog.fromCatalog(NewProductApi.catalog(fakePricesFor))
    Json.toJson(wireCatalog) shouldBe Json.parse(expected)
  }
}

