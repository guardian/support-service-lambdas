package com.gu.newproduct.api

import com.gu.newproduct.api.productcatalog.{AmountMinorUnits, PlanWithPrice, PricesFromZuoraCatalog}
import com.gu.newproduct.api.productcatalog.PlanId._
import com.gu.newproduct.api.productcatalog.ZuoraIds.ProductRatePlanId
import com.gu.util.config.LoadConfigModule.{S3Location, StringFromS3}
import com.gu.util.config.{Stage, ZuoraEnvironment}
import com.gu.util.resthttp.Types.ClientSuccess

import scala.io.Source
import org.scalatest.{FlatSpec, Matchers}

import scala.util.{Success, Try}

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
      ProductRatePlanId("2c92c0f9555cf10501556e84a70440e2") -> VoucherEveryDay,
      ProductRatePlanId("2c92c0f95aff3b56015b1045fb9332d2") -> VoucherSunday,
      ProductRatePlanId("2c92c0f861f9c26d0161fc434bfe004c") -> VoucherSaturday,
      ProductRatePlanId("2c92c0f8555ce5cf01556e7f01b81b94") -> VoucherWeekend,
      ProductRatePlanId("2c92c0f8555ce5cf01556e7f01771b8a") -> VoucherSixDay,
      ProductRatePlanId("2c92c0f95aff3b53015b10469bbf5f5f") -> VoucherEveryDayPlus,
      ProductRatePlanId("2c92c0f955a0b5bf0155b62623846fc8") -> VoucherSundayPlus,
      ProductRatePlanId("2c92c0f961f9cf300161fc44f2661258") -> VoucherSaturdayPlus,
      ProductRatePlanId("2c92c0f95aff3b54015b1047efaa2ac3") -> VoucherWeekendPlus,
      ProductRatePlanId("2c92c0f855c3b8190155c585a95e6f5a") -> VoucherSixDayPlus
    )

    val actual = PricesFromZuoraCatalog(
      ZuoraEnvironment("DEV"),
      fakeGetStringFromS3,
      rateplanToPlanId.get
    )
    actual shouldBe ClientSuccess(
      List(
        PlanWithPrice(VoucherSaturdayPlus, Some(AmountMinorUnits(2161))),
        PlanWithPrice(VoucherSundayPlus, Some(AmountMinorUnits(2206))),
        PlanWithPrice(VoucherWeekendPlus, Some(AmountMinorUnits(1256))),
        PlanWithPrice(VoucherSixDayPlus, Some(AmountMinorUnits(2736))),
        PlanWithPrice(VoucherEveryDayPlus, Some(AmountMinorUnits(2920))),
        PlanWithPrice(VoucherSunday, Some(AmountMinorUnits(1079))),
        PlanWithPrice(VoucherWeekend, Some(AmountMinorUnits(390))),
        PlanWithPrice(VoucherSixDay, Some(AmountMinorUnits(2386))),
        PlanWithPrice(VoucherEveryDay, Some(AmountMinorUnits(2486))),
        PlanWithPrice(VoucherSaturday, Some(AmountMinorUnits(1036)))
      )
    )
  }
}
