package com.gu.newproduct.api

import com.gu.newproduct.api.productcatalog.PlanId._
import com.gu.newproduct.api.productcatalog.ZuoraIds.ProductRatePlanId
import com.gu.newproduct.api.productcatalog.{AmountMinorUnits, PricesFromZuoraCatalog}
import com.gu.util.config.LoadConfigModule.{S3Location, StringFromS3}
import com.gu.util.config.ZuoraEnvironment
import com.gu.util.resthttp.Types.ClientSuccess
import org.scalatest.{FlatSpec, Matchers}
import scala.util.Try

class PricesFromZuoraCatalogTest extends FlatSpec with Matchers {

  val fakeGetStringFromS3: StringFromS3 = s3Location => {
    s3Location shouldBe S3Location(bucket = "gu-zuora-catalog", key = "PROD/Zuora-DEV/catalog.json")
    Try {
      """
        |{
        |  "products": [
        |    {
        |      "id": "voucherProductId",
        |      "productRatePlans": [
        |        {
        |          "id": "VoucherSaturdayPlusId",
        |          "productRatePlanCharges": [
        |            {
        |              "name": "Saturday",
        |              "pricing": [ { "currency": "GBP", "price": 10.36 } ]
        |            },
        |            {
        |              "name": "Digital Pack",
        |              "pricing": [ { "currency": "GBP", "price": 11.26 } ]
        |            }
        |          ]
        |        },
        |        {
        |          "id": "VoucherSundayPlusId",
        |          "productRatePlanCharges": [
        |            {
        |              "name": "Digital Pack",
        |              "pricing": [ { "currency": "GBP", "price": 11.27 }
        |              ]
        |            },
        |            {
        |              "name": "Sunday",
        |              "pricing": [ {"currency": "GBP", "price": 10.79 } ]
        |            }
        |          ]
        |        }
        |      ]
        |    }
        |  ]
        |}
      """.stripMargin
    }
  }

  it should "load catalog" in {

    val rateplanToPlanId = Map(
      ProductRatePlanId("VoucherSundayPlusId") -> VoucherSundayPlus,
      ProductRatePlanId("VoucherSaturdayPlusId") -> VoucherSaturdayPlus,
    )

    val actual = PricesFromZuoraCatalog(
      ZuoraEnvironment("DEV"),
      fakeGetStringFromS3,
      rateplanToPlanId.get
    )
    actual shouldBe ClientSuccess(
      Map(
        VoucherSaturdayPlus -> AmountMinorUnits(2161),
        VoucherSundayPlus -> AmountMinorUnits(2206)
      )
    )
  }
}
