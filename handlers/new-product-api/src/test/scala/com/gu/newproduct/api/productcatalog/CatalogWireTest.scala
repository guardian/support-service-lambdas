package com.gu.newproduct.api.productcatalog

import java.time.DayOfWeek._
import java.time.{DayOfWeek, LocalDate}

import com.gu.i18n.Currency
import com.gu.newproduct.api.productcatalog.PlanId._
import com.gu.newproduct.api.productcatalog.WireModel._
import org.scalatest.flatspec.AnyFlatSpec
import org.scalatest.matchers.should.Matchers
import play.api.libs.json.Json

class CatalogWireTest extends AnyFlatSpec with Matchers {
  it should "serialise catalog" in {
    val expected =
      """
        |{
        |  "products": [
        |  {
        |    "label" : "Supporter Plus",
        |    "plans" : [ {
        |      "id" : "monthly_supporter_plus",
        |      "label" : "Monthly",
        |      "startDateRules" : {
        |        "daysOfWeek" : [ "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday" ],
        |        "selectableWindow" : {
        |          "startDate" : "2019-12-01",
        |          "sizeInDays" : 1
        |        }
        |      },
        |      "paymentPlans": []
        |    }, {
        |      "id" : "annual_supporter_plus",
        |      "label" : "Annual",
        |      "startDateRules" : {
        |        "daysOfWeek" : [ "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday" ],
        |        "selectableWindow" : {
        |          "startDate" : "2019-12-01",
        |          "sizeInDays" : 1
        |        }
        |      },
        |      "paymentPlans": []
        |    } ]
        |  },
        |    {
        |      "label": "Contribution",
        |      "plans": [
        |        {
        |          "id": "monthly_contribution",
        |          "label": "Monthly",
        |          "startDateRules": {
        |            "daysOfWeek": [
        |              "Monday",
        |              "Tuesday",
        |              "Wednesday",
        |              "Thursday",
        |              "Friday",
        |              "Saturday",
        |              "Sunday"
        |            ],
        |            "selectableWindow": {
        |              "startDate": "2019-12-01",
        |              "sizeInDays": 1
        |            }
        |          },
        |          "paymentPlans": []
        |        },
        |        {
        |          "id": "annual_contribution",
        |          "label": "Annual",
        |          "startDateRules": {
        |            "daysOfWeek": [
        |              "Monday",
        |              "Tuesday",
        |              "Wednesday",
        |              "Thursday",
        |              "Friday",
        |              "Saturday",
        |              "Sunday"
        |            ],
        |            "selectableWindow": {
        |              "startDate": "2019-12-01",
        |              "sizeInDays": 1
        |            }
        |          },
        |          "paymentPlans": []
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
        |              "startDate": "2020-03-01",
        |              "sizeInDays": 35
        |            }
        |          },
        |          "paymentPlans": [
        |            {
        |              "currencyCode": "GBP",
        |              "description": "GBP 47.62 every month"
        |            }
        |          ],
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
        |              "startDate": "2020-03-01",
        |              "sizeInDays": 35
        |            }
        |          },
        |          "paymentPlans": [
        |            {
        |              "currencyCode": "GBP",
        |              "description": "GBP 51.96 every month"
        |            }
        |          ],
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
        |              "startDate": "2020-03-02",
        |              "sizeInDays": 35
        |            }
        |          },
        |          "paymentPlans": [
        |            {
        |              "currencyCode": "GBP",
        |              "description": "GBP 10.36 every month"
        |            }
        |          ],
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
        |              "startDate": "2020-03-02",
        |              "sizeInDays": 35
        |            }
        |          },
        |          "paymentPlans": [
        |            {
        |              "currencyCode": "GBP",
        |              "description": "GBP 21.62 every month"
        |            }
        |          ],
        |           "paymentPlan": "GBP 21.62 every month"
        |        },
        |        {
        |          "id": "voucher_sixday",
        |          "label": "Sixday",
        |          "startDateRules": {
        |            "daysOfWeek": [
        |              "Monday"
        |            ],
        |            "selectableWindow": {
        |              "startDate": "2020-03-01",
        |              "sizeInDays": 35
        |            }
        |          },
        |          "paymentPlans": [
        |            {
        |              "currencyCode": "GBP",
        |              "description": "GBP 41.12 every month"
        |            }
        |          ],
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
        |              "startDate": "2020-03-01",
        |              "sizeInDays": 35
        |            }
        |          },
        |          "paymentPlans": [
        |            {
        |              "currencyCode": "GBP",
        |              "description": "GBP 47.62 every month"
        |            }
        |          ],
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
        |              "startDate": "2020-03-03",
        |              "sizeInDays": 35
        |            }
        |          },
        |          "paymentPlans": [
        |            {
        |              "currencyCode": "GBP",
        |              "description": "GBP 10.79 every month"
        |            }
        |          ],
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
        |              "startDate": "2020-03-03",
        |              "sizeInDays": 35
        |            }
        |          },
        |          "paymentPlans": [
        |            {
        |              "currencyCode": "GBP",
        |              "description": "GBP 22.06 every month"
        |            }
        |          ],
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
        |              "startDate": "2020-03-02",
        |              "sizeInDays": 35
        |            }
        |          },
        |          "paymentPlans": [
        |            {
        |              "currencyCode": "GBP",
        |              "description": "GBP 20.76 every month"
        |            }
        |          ],
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
        |              "startDate": "2020-03-02",
        |              "sizeInDays": 35
        |            }
        |          },
        |          "paymentPlans": [
        |            {
        |              "currencyCode": "GBP",
        |              "description": "GBP 29.42 every month"
        |            }
        |          ],
        |          "paymentPlan": "GBP 29.42 every month"
        |        }
        |      ]
        |    },
        |    {
        |      "label": "Home Delivery",
        |      "plans": [
        |        {
        |          "id": "home_delivery_everyday",
        |          "label": "Everyday",
        |          "startDateRules": {
        |            "daysOfWeek": [
        |              "Monday",
        |              "Tuesday",
        |              "Wednesday",
        |              "Thursday",
        |              "Friday",
        |              "Saturday",
        |              "Sunday"
        |            ],
        |            "selectableWindow": {
        |              "startDate": "2020-02-01",
        |              "sizeInDays": 28
        |            }
        |          },
        |          "paymentPlans": [
        |            {
        |              "currencyCode": "GBP",
        |              "description": "GBP 1.23 every month"
        |            }
        |          ],
        |          "paymentPlan": "GBP 1.23 every month"
        |        },
        |        {
        |          "id": "home_delivery_everyday_plus",
        |          "label": "Everyday+",
        |          "startDateRules": {
        |            "daysOfWeek": [
        |              "Monday",
        |              "Tuesday",
        |              "Wednesday",
        |              "Thursday",
        |              "Friday",
        |              "Saturday",
        |              "Sunday"
        |            ],
        |            "selectableWindow": {
        |              "startDate": "2020-02-01",
        |              "sizeInDays": 28
        |            }
        |          },
        |          "paymentPlans": [
        |            {
        |              "currencyCode": "GBP",
        |              "description": "GBP 9.99 every month"
        |            }
        |          ],
        |          "paymentPlan": "GBP 9.99 every month"
        |        },
        |        {
        |          "id": "home_delivery_saturday",
        |          "label": "Saturday",
        |          "startDateRules": {
        |            "daysOfWeek": [
        |              "Saturday"
        |            ],
        |            "selectableWindow": {
        |              "startDate": "2020-02-03",
        |              "sizeInDays": 28
        |            }
        |          },
        |          "paymentPlans": [
        |            {
        |              "currencyCode": "GBP",
        |              "description": "GBP 4.56 every month"
        |            }
        |          ],
        |          "paymentPlan": "GBP 4.56 every month"
        |        },
        |        {
        |          "id": "home_delivery_saturday_plus",
        |          "label": "Saturday+",
        |          "startDateRules": {
        |            "daysOfWeek": [
        |              "Saturday"
        |            ],
        |            "selectableWindow": {
        |              "startDate": "2020-02-03",
        |              "sizeInDays": 28
        |            }
        |          },
        |          "paymentPlans": [
        |            {
        |              "currencyCode": "GBP",
        |              "description": "GBP 6.78 every month"
        |            }
        |          ],
        |           "paymentPlan": "GBP 6.78 every month"
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
        |              "startDate": "2020-02-02",
        |              "sizeInDays": 28
        |            }
        |          },
        |          "paymentPlans": [
        |            {
        |              "currencyCode": "GBP",
        |              "description": "GBP 7.77 every month"
        |            }
        |          ],
        |          "paymentPlan": "GBP 7.77 every month"
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
        |              "startDate": "2020-02-02",
        |              "sizeInDays": 28
        |            }
        |          },
        |          "paymentPlans": [
        |            {
        |              "currencyCode": "GBP",
        |              "description": "GBP 11.11 every month"
        |            }
        |          ],
        |          "paymentPlan": "GBP 11.11 every month"
        |        },
        |        {
        |          "id": "home_delivery_sunday",
        |          "label": "Sunday",
        |          "startDateRules": {
        |            "daysOfWeek": [
        |              "Sunday"
        |            ],
        |            "selectableWindow": {
        |              "startDate": "2020-02-04",
        |              "sizeInDays": 28
        |            }
        |          },
        |          "paymentPlans": [
        |            {
        |              "currencyCode": "GBP",
        |              "description": "GBP 3.21 every month"
        |            }
        |          ],
        |          "paymentPlan": "GBP 3.21 every month"
        |        },
        |        {
        |          "id": "home_delivery_sunday_plus",
        |          "label": "Sunday+",
        |          "startDateRules": {
        |            "daysOfWeek": [
        |              "Sunday"
        |            ],
        |            "selectableWindow": {
        |              "startDate": "2020-02-04",
        |              "sizeInDays": 28
        |            }
        |          },
        |          "paymentPlans": [
        |            {
        |              "currencyCode": "GBP",
        |              "description": "GBP 10.10 every month"
        |            }
        |          ],
        |          "paymentPlan": "GBP 10.10 every month"
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
        |              "startDate": "2020-02-05",
        |              "sizeInDays": 28
        |            }
        |          },
        |          "paymentPlans": [
        |            {
        |              "currencyCode": "GBP",
        |              "description": "GBP 8.88 every month"
        |            }
        |          ],
        |           "paymentPlan": "GBP 8.88 every month"
        |        },
        |        {
        |          "id": "home_delivery_weekend_plus",
        |          "label": "Weekend+",
        |          "startDateRules": {
        |            "daysOfWeek": [
        |              "Saturday",
        |              "Sunday"
        |            ],
        |            "selectableWindow": {
        |              "startDate": "2020-02-05",
        |              "sizeInDays": 28
        |            }
        |          },
        |          "paymentPlans": [
        |            {
        |              "currencyCode": "GBP",
        |              "description": "GBP 22.22 every month"
        |            }
        |          ],
        |           "paymentPlan": "GBP 22.22 every month"
        |        }
        |      ]
        |    },
        |    {
        |      "label": "Digital Pack",
        |      "plans": [
        |        {
        |          "id": "digipack_annual",
        |          "label": "Annual",
        |          "startDateRules": {
        |            "daysOfWeek": [
        |              "Monday",
        |              "Tuesday",
        |              "Wednesday",
        |              "Thursday",
        |              "Friday",
        |              "Saturday",
        |              "Sunday"
        |            ],
        |            "selectableWindow": {
        |              "startDate": "2019-12-15",
        |              "sizeInDays": 90
        |            }
        |          },
        |          "paymentPlans": [
        |            {
        |              "currencyCode": "GBP",
        |              "description": "GBP 666.66 every 12 months"
        |            },
        |            {
        |              "currencyCode": "USD",
        |              "description": "USD 666.65 every 12 months"
        |            }
        |          ],
        |          "paymentPlan": "GBP 666.66 every 12 months"
        |        },
        |        {
        |          "id": "digipack_monthly",
        |          "label": "Monthly",
        |          "startDateRules": {
        |            "daysOfWeek": [
        |              "Monday",
        |              "Tuesday",
        |              "Wednesday",
        |              "Thursday",
        |              "Friday",
        |              "Saturday",
        |              "Sunday"
        |            ],
        |            "selectableWindow": {
        |              "startDate": "2019-12-15",
        |              "sizeInDays": 90
        |            }
        |          },
        |          "paymentPlans": [
        |            {
        |              "currencyCode": "GBP",
        |              "description": "GBP 55.55 every month"
        |            },
        |            {
        |              "currencyCode": "USD",
        |              "description": "USD 55.54 every month"
        |            }
        |          ],
        |          "paymentPlan": "GBP 55.55 every month"
        |        }
        |      ]
        |    },
        |    {
        |      "label": "Guardian Weekly - Domestic",
        |      "plans": [
        |        {
        |          "id": "guardian_weekly_domestic_6for6",
        |          "label": "GW Oct 18 - Six for Six - Domestic",
        |          "startDateRules": {
        |            "daysOfWeek": [
        |              "Friday"
        |            ],
        |            "selectableWindow": {
        |              "startDate": "2020-01-01",
        |              "sizeInDays": 28
        |            }
        |          },
        |          "paymentPlans": [
        |            {
        |              "currencyCode": "GBP",
        |              "description": "GBP 11111.11 for the first six weeks"
        |            },
        |            {
        |              "currencyCode": "USD",
        |              "description": "USD 111111.11 for the first six weeks"
        |            }
        |          ],
        |          "paymentPlan": "GBP 11111.11 for the first six weeks"
        |        },
        |        {
        |          "id": "guardian_weekly_domestic_quarterly",
        |          "label": "GW Oct 18 - Quarterly - Domestic",
        |          "startDateRules": {
        |            "daysOfWeek": [
        |              "Friday"
        |            ],
        |            "selectableWindow": {
        |              "startDate": "2020-01-01",
        |              "sizeInDays": 28
        |            }
        |          },
        |          "paymentPlans": [
        |            {
        |              "currencyCode": "GBP",
        |              "description": "GBP 22222.22 every 3 months"
        |            },
        |            {
        |              "currencyCode": "USD",
        |              "description": "USD 222222.22 every 3 months"
        |            }
        |          ],
        |          "paymentPlan": "GBP 22222.22 every 3 months"
        |        },
        |        {
        |          "id": "guardian_weekly_domestic_annual",
        |          "label": "GW Oct 18 - Annual - Domestic",
        |          "startDateRules": {
        |            "daysOfWeek": [
        |              "Friday"
        |            ],
        |            "selectableWindow": {
        |              "startDate": "2020-01-01",
        |              "sizeInDays": 28
        |            }
        |          },
        |          "paymentPlans": [
        |            {
        |              "currencyCode": "GBP",
        |              "description": "GBP 33333.33 every 12 months"
        |            },
        |            {
        |              "currencyCode": "USD",
        |              "description": "USD 333333.33 every 12 months"
        |            }
        |          ],
        |          "paymentPlan": "GBP 33333.33 every 12 months"
        |        }
        |      ],
        |      "enabledForDeliveryCountries": [
        |        "Australia", "Kiribati", "Nauru", "Norfolk Island", "Tuvalu", "Canada", "Andorra", "Albania",
        |        "Austria", "Bosnia-Herzegovina", "Belgium", "Bulgaria", "Saint Barthélemy", "Switzerland", "Cyprus",
        |        "Czech Republic", "Germany", "Denmark", "Estonia", "Spain", "Finland", "Faroe Islands", "France",
        |        "French Guiana", "Greenland", "Guadeloupe", "Greece", "Croatia", "Hungary", "Ireland", "Italy",
        |        "Liechtenstein", "Lithuania", "Luxembourg", "Latvia", "Monaco", "Montenegro", "Saint Martin",
        |        "Iceland", "Martinique", "Malta", "Netherlands", "Norway", "French Polynesia", "Poland",
        |        "Saint Pierre & Miquelon", "Portugal", "Réunion", "Romania", "Serbia", "Sweden", "Slovenia",
        |        "Svalbard and Jan Mayen", "Slovakia", "San Marino", "French Southern Territories",
        |        "Wallis & Futuna", "Mayotte", "Holy See", "Åland Islands", "New Zealand", "Cook Islands",
        |        "United Kingdom","Falkland Islands","Gibraltar","Guernsey","Isle of Man","Jersey","Saint Helena",
        |        "United States"
        |      ]
        |    },
        |    {
        |      "label": "Guardian Weekly - ROW",
        |      "plans": [
        |        {
        |          "id": "guardian_weekly_row_6for6",
        |          "label": "GW Oct 18 - Six for Six - ROW",
        |          "startDateRules": {
        |            "daysOfWeek": [
        |              "Friday"
        |            ],
        |            "selectableWindow": {
        |              "startDate": "2020-01-01",
        |              "sizeInDays": 28
        |            }
        |          },
        |          "paymentPlans": [
        |            {
        |              "currencyCode": "GBP",
        |              "description": "GBP 44444.44 for the first six weeks"
        |            },
        |            {
        |              "currencyCode": "USD",
        |              "description": "USD 444444.44 for the first six weeks"
        |            }
        |          ],
        |          "paymentPlan": "GBP 44444.44 for the first six weeks"
        |        },
        |        {
        |          "id": "guardian_weekly_row_quarterly",
        |          "label": "GW Oct 18 - Quarterly - ROW",
        |          "startDateRules": {
        |            "daysOfWeek": [
        |              "Friday"
        |            ],
        |            "selectableWindow": {
        |              "startDate": "2020-01-01",
        |              "sizeInDays": 28
        |            }
        |          },
        |          "paymentPlans": [
        |            {
        |              "currencyCode": "GBP",
        |              "description": "GBP 55555.55 every 3 months"
        |            },
        |            {
        |              "currencyCode": "USD",
        |              "description": "USD 555555.55 every 3 months"
        |            }
        |          ],
        |          "paymentPlan": "GBP 55555.55 every 3 months"
        |        },
        |        {
        |          "id": "guardian_weekly_row_annual",
        |          "label": "GW Oct 18 - Annual - ROW",
        |          "startDateRules": {
        |            "daysOfWeek": [
        |              "Friday"
        |            ],
        |            "selectableWindow": {
        |              "startDate": "2020-01-01",
        |              "sizeInDays": 28
        |            }
        |          },
        |          "paymentPlans": [
        |            {
        |              "currencyCode": "GBP",
        |              "description": "GBP 66666.66 every 12 months"
        |            },
        |            {
        |              "currencyCode": "USD",
        |              "description": "USD 666666.66 every 12 months"
        |            }
        |          ],
        |          "paymentPlan": "GBP 66666.66 every 12 months"
        |        }
        |      ],
        |      "enabledForDeliveryCountries": [
        |        "United Arab Emirates", "Afghanistan", "Antigua & Barbuda", "Anguilla", "Armenia", "Angola",
        |        "Antarctica", "Argentina", "American Samoa", "Aruba", "Azerbaijan", "Barbados", "Bangladesh",
        |        "Burkina Faso", "Bahrain", "Burundi", "Benin", "Bermuda", "Brunei Darussalam", "Bolivia",
        |        "Bonaire, Saint Eustatius and Saba", "Brazil", "Bahamas", "Bhutan", "Bouvet Island", "Botswana",
        |        "Belarus", "Belize", "Cocos (Keeling) Islands", "Congo (Kinshasa)", "Central African Republic",
        |        "Congo (Brazzaville)", "Ivory Coast", "Chile", "Cameroon", "China", "Colombia", "Costa Rica", "Cuba",
        |        "Cape Verde Islands", "Curaçao", "Christmas Island", "Djibouti", "Dominica", "Dominican Republic",
        |        "Algeria", "Ecuador", "Egypt", "Western Sahara", "Eritrea", "Ethiopia", "Fiji", "Micronesia", "Gabon",
        |        "Grenada", "Georgia", "Ghana", "Gambia", "Guinea", "Equatorial Guinea",
        |        "South Georgia & The South Sandwich Islands", "Guatemala", "Guam", "Guinea-Bissau", "Guyana",
        |        "Hong Kong", "Heard Island and McDonald Islands", "Honduras", "Haiti", "Indonesia", "Israel",
        |        "India", "British Indian Ocean Territory", "Iraq", "Iran", "Jamaica", "Jordan", "Japan", "Kenya",
        |        "Kyrgyzstan", "Cambodia", "Comoros", "Saint Christopher & Nevis", "North Korea", "South Korea",
        |        "Kuwait", "Cayman Islands", "Kazakhstan", "Laos", "Lebanon", "Saint Lucia", "Sri Lanka", "Liberia",
        |        "Lesotho", "Libya", "Morocco", "Moldova", "Madagascar", "Marshall Islands", "Macedonia", "Mali",
        |        "Myanmar", "Mongolia", "Macau", "Northern Mariana Islands", "Mauritania", "Montserrat", "Mauritius",
        |        "Maldives", "Malawi", "Mexico", "Malaysia", "Mozambique", "Namibia", "New Caledonia", "Niger",
        |        "Nigeria", "Nicaragua", "Nepal", "Niue", "Oman", "Panama", "Peru", "Papua New Guinea",
        |        "Philippines", "Pakistan", "Pitcairn Islands", "Puerto Rico", "Palestinian Territories",
        |        "Palau", "Paraguay", "Qatar", "Russia", "Rwanda", "Saudi Arabia", "Solomon Islands", "Seychelles",
        |        "Sudan", "Singapore", "Sierra Leone", "Senegal", "Somalia", "Suriname", "South Sudan",
        |        "Sao Tome & Principe", "El Salvador", "Sint Maarten", "Syria", "Swaziland", "Turks & Caicos Islands",
        |        "Chad", "Togo", "Thailand", "Tajikistan", "Tokelau", "East Timor", "Turkmenistan", "Tunisia", "Tonga", "Turkey",
        |        "Trinidad & Tobago", "Taiwan", "Tanzania", "Ukraine", "Uganda", "United States Minor Outlying Islands",
        |        "Uruguay", "Uzbekistan", "Saint Vincent & The Grenadines", "Venezuela", "British Virgin Islands",
        |        "United States Virgin Islands", "Vietnam", "Vanuatu", "Samoa", "Yemen", "South Africa", "Zambia",
        |        "Zimbabwe"
        |      ]
        |    },
        |    {
        |      "label": "Subscription Card",
        |      "plans": [
        |        {
        |          "id": "digital_voucher_weekend",
        |          "label": "Weekend",
        |          "startDateRules": {
        |            "daysOfWeek": [
        |              "Saturday",
        |              "Sunday"
        |            ],
        |            "selectableWindow": {
        |              "startDate": "2020-04-03",
        |              "sizeInDays": 1
        |            }
        |          },
        |          "paymentPlans": [
        |            {
        |              "currencyCode": "GBP",
        |              "description": "GBP 70.05 every month"
        |            }
        |          ],
        |          "paymentPlan": "GBP 70.05 every month"
        |        },
        |        {
        |          "id": "digital_voucher_weekend_plus",
        |          "label": "Weekend+",
        |          "startDateRules": {
        |            "daysOfWeek": [
        |              "Saturday",
        |              "Sunday"
        |            ],
        |            "selectableWindow": {
        |              "startDate": "2020-04-03",
        |              "sizeInDays": 1
        |            }
        |          },
        |          "paymentPlans": [
        |            {
        |              "currencyCode": "GBP",
        |              "description": "GBP 70.06 every month"
        |            }
        |          ],
        |          "paymentPlan": "GBP 70.06 every month"
        |        },
        |        {
        |          "id": "digital_voucher_everyday",
        |          "label": "Everyday",
        |          "startDateRules": {
        |            "daysOfWeek": [
        |              "Monday",
        |              "Tuesday",
        |              "Wednesday",
        |              "Thursday",
        |              "Friday",
        |              "Saturday",
        |              "Sunday"
        |            ],
        |            "selectableWindow": {
        |              "startDate": "2020-04-01",
        |              "sizeInDays": 1
        |            }
        |          },
        |          "paymentPlans": [
        |            {
        |              "currencyCode": "GBP",
        |              "description": "GBP 70.01 every month"
        |            }
        |          ],
        |          "paymentPlan": "GBP 70.01 every month"
        |        },
        |        {
        |          "id": "digital_voucher_everyday_plus",
        |          "label": "Everyday+",
        |          "startDateRules": {
        |            "daysOfWeek": [
        |              "Monday",
        |              "Tuesday",
        |              "Wednesday",
        |              "Thursday",
        |              "Friday",
        |              "Saturday",
        |              "Sunday"
        |            ],
        |            "selectableWindow": {
        |              "startDate": "2020-04-01",
        |              "sizeInDays": 1
        |            }
        |          },
        |          "paymentPlans": [
        |            {
        |              "currencyCode": "GBP",
        |              "description": "GBP 70.02 every month"
        |            }
        |          ],
        |          "paymentPlan": "GBP 70.02 every month"
        |        },
        |        {
        |          "id": "digital_voucher_saturday",
        |          "label": "Saturday",
        |          "startDateRules": {
        |            "daysOfWeek": [
        |              "Saturday"
        |            ],
        |            "selectableWindow": {
        |              "startDate": "2020-04-04",
        |              "sizeInDays": 1
        |            }
        |          },
        |          "paymentPlans": [
        |            {
        |              "currencyCode": "GBP",
        |              "description": "GBP 70.07 every month"
        |            }
        |          ],
        |          "paymentPlan": "GBP 70.07 every month"
        |        },
        |        {
        |          "id": "digital_voucher_saturday_plus",
        |          "label": "Saturday+",
        |          "startDateRules": {
        |            "daysOfWeek": [
        |              "Saturday"
        |            ],
        |            "selectableWindow": {
        |              "startDate": "2020-04-04",
        |              "sizeInDays": 1
        |            }
        |          },
        |          "paymentPlans": [
        |            {
        |              "currencyCode": "GBP",
        |              "description": "GBP 70.08 every month"
        |            }
        |          ],
        |          "paymentPlan": "GBP 70.08 every month"
        |        },
        |        {
        |          "id": "digital_voucher_sunday",
        |          "label": "Sunday",
        |          "startDateRules": {
        |            "daysOfWeek": [
        |              "Sunday"
        |            ],
        |            "selectableWindow": {
        |              "startDate": "2020-04-05",
        |              "sizeInDays": 1
        |            }
        |          },
        |          "paymentPlans": [
        |            {
        |              "currencyCode": "GBP",
        |              "description": "GBP 70.09 every month"
        |            }
        |          ],
        |          "paymentPlan": "GBP 70.09 every month"
        |        },
        |        {
        |          "id": "digital_voucher_sunday_plus",
        |          "label": "Sunday+",
        |          "startDateRules": {
        |            "daysOfWeek": [
        |              "Sunday"
        |            ],
        |            "selectableWindow": {
        |              "startDate": "2020-04-05",
        |              "sizeInDays": 1
        |            }
        |          },
        |          "paymentPlans": [
        |            {
        |              "currencyCode": "GBP",
        |              "description": "GBP 70.10 every month"
        |            }
        |          ],
        |          "paymentPlan": "GBP 70.10 every month"
        |        },
        |        {
        |          "id": "digital_voucher_sixday",
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
        |              "startDate": "2020-04-02",
        |              "sizeInDays": 1
        |            }
        |          },
        |          "paymentPlans": [
        |            {
        |              "currencyCode": "GBP",
        |              "description": "GBP 70.03 every month"
        |            }
        |          ],
        |          "paymentPlan": "GBP 70.03 every month"
        |        },
        |        {
        |          "id": "digital_voucher_sixday_plus",
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
        |              "startDate": "2020-04-02",
        |              "sizeInDays": 1
        |            }
        |          },
        |          "paymentPlans": [
        |            {
        |              "currencyCode": "GBP",
        |              "description": "GBP 70.04 every month"
        |            }
        |          ],
        |          "paymentPlan": "GBP 70.04 every month"
        |        }
        |      ],
        |      "enabledForDeliveryCountries": [
        |        "United Kingdom"
        |      ]
        |    }
        |  ]
        |}
      """.stripMargin

    def gbpPrice(amount: Int): Map[Currency, AmountMinorUnits] = Map(
      Currency.GBP -> AmountMinorUnits(amount)
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
      case DigipackMonthly => Map(
        Currency.GBP -> AmountMinorUnits(5555),
        Currency.USD -> AmountMinorUnits(5554)
      )
      case DigipackAnnual => Map(
        Currency.GBP -> AmountMinorUnits(66666),
        Currency.USD -> AmountMinorUnits(66665),
      )
      case GuardianWeeklyDomestic6for6 => Map(
        Currency.GBP -> AmountMinorUnits(1111111),
        Currency.USD -> AmountMinorUnits(11111111),
      )
      case GuardianWeeklyDomesticQuarterly => Map(
        Currency.GBP -> AmountMinorUnits(2222222),
        Currency.USD -> AmountMinorUnits(22222222),
      )
      case GuardianWeeklyDomesticAnnual => Map(
        Currency.GBP -> AmountMinorUnits(3333333),
        Currency.USD -> AmountMinorUnits(33333333),
      )
      case GuardianWeeklyROW6for6 => Map(
        Currency.GBP -> AmountMinorUnits(4444444),
        Currency.USD -> AmountMinorUnits(44444444),
      )
      case GuardianWeeklyROWQuarterly => Map(
        Currency.GBP -> AmountMinorUnits(5555555),
        Currency.USD -> AmountMinorUnits(55555555),
      )
      case GuardianWeeklyROWAnnual => Map(
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
    }

    def stubGetFirstAvailableStartDate(productType: ProductType, daysOfWeek: List[DayOfWeek]) = {
      (productType, daysOfWeek) match {
        case (ProductType.GuardianWeekly, List(FRIDAY) ) =>
          LocalDate.of(2020, 1, 1)
        case (ProductType.NewspaperHomeDelivery, List(MONDAY, TUESDAY, WEDNESDAY, THURSDAY, FRIDAY, SATURDAY, SUNDAY) ) =>
          LocalDate.of(2020, 2, 1)
        case (ProductType.NewspaperHomeDelivery, List(MONDAY, TUESDAY, WEDNESDAY, THURSDAY, FRIDAY, SATURDAY) ) =>
          LocalDate.of(2020, 2, 2)
        case (ProductType.NewspaperHomeDelivery, List(SATURDAY) ) =>
          LocalDate.of(2020, 2, 3)
        case (ProductType.NewspaperHomeDelivery, List(SUNDAY) ) =>
          LocalDate.of(2020, 2, 4)
        case (ProductType.NewspaperHomeDelivery, List(SATURDAY, SUNDAY) ) =>
          LocalDate.of(2020, 2, 5)
        case (ProductType.NewspaperVoucherBook, List(MONDAY) ) =>
          LocalDate.of(2020, 3, 1)
        case (ProductType.NewspaperVoucherBook, List(SATURDAY) ) =>
          LocalDate.of(2020, 3, 2)
        case (ProductType.NewspaperVoucherBook, List(SUNDAY) ) =>
          LocalDate.of(2020, 3, 3)
        case (ProductType.NewspaperDigitalVoucher, List(MONDAY, TUESDAY, WEDNESDAY, THURSDAY, FRIDAY, SATURDAY, SUNDAY) ) =>
          LocalDate.of(2020, 4, 1)
        case (ProductType.NewspaperDigitalVoucher, List(MONDAY, TUESDAY, WEDNESDAY, THURSDAY, FRIDAY, SATURDAY) ) =>
          LocalDate.of(2020, 4, 2)
        case (ProductType.NewspaperDigitalVoucher, List(SATURDAY, SUNDAY) ) =>
          LocalDate.of(2020, 4, 3)
        case (ProductType.NewspaperDigitalVoucher, List(SATURDAY) ) =>
          LocalDate.of(2020, 4, 4)
        case (ProductType.NewspaperDigitalVoucher, List(SUNDAY) ) =>
          LocalDate.of(2020, 4, 5)
      }
    }

    val today = LocalDate.of(2019,12,1)

    val wireCatalog = WireCatalog.fromCatalog(
      NewProductApi.catalog(fakePricesFor, stubGetFirstAvailableStartDate, today)
    )

    Json.toJson(wireCatalog) shouldBe Json.parse(expected)
  }
}

