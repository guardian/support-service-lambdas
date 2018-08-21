package com.gu.newproduct.api

import com.gu.newproduct.api.productcatalog.PlanId._
import com.gu.newproduct.api.productcatalog.ZuoraIds.ProductRatePlanId
import com.gu.newproduct.api.productcatalog.{AmountMinorUnits, PricesFromZuoraCatalog}
import com.gu.util.config.LoadConfigModule.{S3Location, StringFromS3}
import com.gu.util.config.ZuoraEnvironment
import com.gu.util.resthttp.Types.ClientSuccess
import org.scalatest.{FlatSpec, Matchers}

import scala.io.Source
import scala.util.Try

class PricesFromZuoraCatalogTest extends FlatSpec with Matchers {

  val fakeGetStringFromS3: StringFromS3 = s3Location => {
    s3Location shouldBe S3Location(bucket = "gu-zuora-catalog", key = "PROD/Zuora-DEV/catalog.json")
    Try {
      val source = Source.fromURL(getClass.getResource("/TestZuoraCatalog.json"))
      source.mkString
    }
  }

  it should "load catalog" in {

    val rateplanToPlanId = Map(
      ProductRatePlanId("VoucherEverydayId") -> VoucherEveryDay,
      ProductRatePlanId("VoucherSundayId") -> VoucherSunday,
      ProductRatePlanId("VoucherSaturdayId") -> VoucherSaturday,
      ProductRatePlanId("VoucherWeekendId") -> VoucherWeekend,
      ProductRatePlanId("VoucherSixdayId") -> VoucherSixDay,
      ProductRatePlanId("VoucherEverydayPlusId") -> VoucherEveryDayPlus,
      ProductRatePlanId("VoucherSundayPlusId") -> VoucherSundayPlus,
      ProductRatePlanId("VoucherSaturdayPlusId") -> VoucherSaturdayPlus,
      ProductRatePlanId("VoucherWeekendPlusId") -> VoucherWeekendPlus,
      ProductRatePlanId("VoucherSixdayPlusId") -> VoucherSixDayPlus
    )

    val actual = PricesFromZuoraCatalog(
      ZuoraEnvironment("DEV"),
      fakeGetStringFromS3,
      rateplanToPlanId.get
    )
    actual shouldBe ClientSuccess(
      Map(
        VoucherSaturdayPlus -> AmountMinorUnits(2161),
        VoucherSundayPlus -> AmountMinorUnits(2206),
        VoucherWeekendPlus -> AmountMinorUnits(1256),
        VoucherSixDayPlus -> AmountMinorUnits(2736),
        VoucherEveryDayPlus -> AmountMinorUnits(2920),
        VoucherSunday -> AmountMinorUnits(1079),
        VoucherWeekend -> AmountMinorUnits(390),
        VoucherSixDay -> AmountMinorUnits(2386),
        VoucherEveryDay -> AmountMinorUnits(2486),
        VoucherSaturday -> AmountMinorUnits(1036)
      )
    )
  }
}
