package com.gu.newproduct.api.productcatalog
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
        |      "label": "Voucher",
        |      "plans": [
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
        |          "paymentPlan": "£20.76 every month"
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
        |          "paymentPlan": "£29.42 every month"
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
        |          "paymentPlan": "£10.79 every month"
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
        |          "paymentPlan": "£22.06 every month"
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
        |          "paymentPlan": "£10.36 every month"
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
        |          "paymentPlan": "£21.62 every month"
        |        },
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
        |          "paymentPlan": "£47.62 every month"
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
        |          "paymentPlan": "£51.96 every month"
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
        |          "paymentPlan": "£41.12 every month"
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
        |          "paymentPlan": "£47.62 every month"
        |        }
        |      ]
        |    },
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
        |    }
        |  ]
        |}
      """.stripMargin
    val wireCatalog = WireCatalog.fromCatalog(NewProductApi.catalog)
    Json.toJson(wireCatalog) shouldBe Json.parse(expected)
  }
}


