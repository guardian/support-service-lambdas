package com.gu.newproduct.api

import com.gu.effects.GetFromS3
import com.gu.newproduct.api.productcatalog.PlanId._
import com.gu.newproduct.api.productcatalog.{AmountMinorUnits, PricesFromZuoraCatalog, ZuoraIds}
import com.gu.test.EffectsTest
import com.gu.util.config.{Stage, ZuoraEnvironment}
import org.scalatest.{FlatSpec, Matchers}
import scalaz._

class PricesFromZuoraCatalogEffectsTest extends FlatSpec with Matchers {

  it should "load catalog" taggedAs EffectsTest in {

    val actual = for {
      zuoraIds <- ZuoraIds.zuoraIdsForStage(Stage("DEV")).toDisjunction
      zuoraToPlanId = zuoraIds.voucherZuoraIds.zuoraIdToPlanid.get _
      response <- PricesFromZuoraCatalog(ZuoraEnvironment("DEV"), GetFromS3.fetchString, zuoraToPlanId).toDisjunction
    } yield response
    actual shouldBe \/-(
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
