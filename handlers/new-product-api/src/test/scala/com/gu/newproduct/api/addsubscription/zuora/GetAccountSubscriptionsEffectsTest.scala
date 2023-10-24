package com.gu.newproduct.api.addsubscription.zuora

import com.gu.effects.{GetFromS3, RawEffects}
import com.gu.newproduct.api.addsubscription.ZuoraAccountId
import com.gu.newproduct.api.addsubscription.zuora.GetAccountSubscriptions.WireModel.ZuoraSubscriptionsResponse
import com.gu.newproduct.api.addsubscription.zuora.GetAccountSubscriptions.{Active, Subscription}
import com.gu.newproduct.api.productcatalog.ZuoraIds.ProductRatePlanId
import com.gu.test.EffectsTest
import com.gu.util.config.{LoadConfigModule, Stage}
import com.gu.util.zuora.{ZuoraRestConfig, ZuoraRestRequestMaker}
import org.scalatest.flatspec.AnyFlatSpec
import org.scalatest.matchers.should.Matchers

class GetAccountSubscriptionsEffectsTest extends AnyFlatSpec with Matchers {

  it should "get payment details" taggedAs EffectsTest in {
    val actual = for {
      zuoraRestConfig <- LoadConfigModule(Stage("CODE"), GetFromS3.fetchString).load[ZuoraRestConfig]
      zuoraDeps = ZuoraRestRequestMaker(RawEffects.response, zuoraRestConfig)
      res <- GetAccountSubscriptions(zuoraDeps.get[ZuoraSubscriptionsResponse])(
        ZuoraAccountId("8ad095b882f7aaa60182f9c2a69a043a"),
      ).toDisjunction
    } yield {
      res
    }

    val expected = List(
      Subscription(
        status = Active,
        productRateplanIds = Set(ProductRatePlanId("2c92c0f85a6b134e015a7fcd9f0c7855")),
      ),
    )
    actual shouldBe Right(expected)
  }
}
