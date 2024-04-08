package com.gu.newproduct.api

import com.gu.effects.S3Location
import com.gu.i18n.Currency.{EUR, GBP, USD}
import com.gu.newproduct.api.productcatalog.PlanId._
import com.gu.newproduct.api.productcatalog.ZuoraCatalogWireModel.Price
import com.gu.newproduct.api.productcatalog.ZuoraIds.ProductRatePlanId
import com.gu.newproduct.api.productcatalog.{AmountMinorUnits, PricesFromZuoraCatalog, ZuoraCatalogWireModel}
import com.gu.util.config.LoadConfigModule.StringFromS3
import com.gu.util.config.ZuoraEnvironment
import com.gu.util.resthttp.Types.ClientSuccess

import scala.util.Try
import org.scalatest.flatspec.AnyFlatSpec
import org.scalatest.matchers.should.Matchers

class PricesFromZuoraCatalogTest extends AnyFlatSpec with Matchers {

  val fakeGetStringFromS3: StringFromS3 = s3Location => {
    s3Location shouldBe S3Location(bucket = "gu-zuora-catalog", key = "CODE/Zuora-CODE/catalog.json")
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
        |              "pricing": [ { "currency": "GBP", "price": 10.36 }, { "currency": "EUR", "price": 10.26 }, { "currency": "USD", "price": 10.46 } ]
        |            },
        |            {
        |              "name": "Digital Pack",
        |              "pricing": [ { "currency": "GBP", "price": 11.26 }, { "currency": "USD", "price": 11.46 }, { "currency": "EUR", "price": 11.26 } ]
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
      ZuoraEnvironment("CODE"),
      fakeGetStringFromS3,
      rateplanToPlanId.get,
    )
    actual shouldBe ClientSuccess(
      Map(
        VoucherSaturdayPlus -> Map(
          GBP -> AmountMinorUnits(2162),
          USD -> AmountMinorUnits(2192),
          EUR -> AmountMinorUnits(2152),
        ),
        VoucherSundayPlus -> Map(
          GBP -> AmountMinorUnits(2206),
        ),
      ),
    )
  }

  it should "sum prices correctly" in {
    val prices = List(
      Price(Some(9.78), "GBP"),
      Price(Some(9.79), "GBP"),
      Price(Some(9.79), "GBP"),
      Price(Some(9.79), "GBP"),
      Price(Some(9.79), "GBP"),
      Price(Some(13.05), "GBP"),

    )
    ZuoraCatalogWireModel.sumPrices(prices) shouldBe Some(AmountMinorUnits(6199))
  }
}
