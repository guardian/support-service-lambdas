package com.gu.util

import com.gu.effects.{GetFromS3, RawEffects}
import com.gu.test.EffectsTest
import com.gu.util.config.{LoadConfigModule, Stage}
import com.gu.util.resthttp.Types.ClientFailableOp
import com.gu.util.zuora.SafeQueryBuilder.Implicits._
import com.gu.util.zuora.ZuoraQuery._
import com.gu.util.zuora.{ZuoraQuery, ZuoraRestConfig, ZuoraRestRequestMaker}
import play.api.libs.json.Json
import org.scalatest.flatspec.AnyFlatSpec
import org.scalatest.matchers.should.Matchers

// run this manually
class ZuoraQueryEffectsTest extends AnyFlatSpec with Matchers {

  it should "successfull query multiple accounts" taggedAs EffectsTest in {

    val actual = for {

      zuoraRestConfig <- LoadConfigModule(Stage("CODE"), GetFromS3.fetchString)[ZuoraRestConfig]
      zuoraQuerier = ZuoraQuery(ZuoraRestRequestMaker(RawEffects.response, zuoraRestConfig))
      subs <- SubscriptionsForPromoCode(zuoraQuerier)("""qwerty"asdf'zxcv\1234""").toDisjunction

      // POST query should be - SELECT Id, promotioncode__c FROM Subscription where PromotionCode__c = 'qwerty\"asdf\'zxcv\\1234'

    } yield {
      subs
    }
    actual.map(_.map(_.PromotionCode__c)) should be(Right(List("""qwerty"asdf'zxcv\1234""")))

  }

}

object SubscriptionsForPromoCode {

  // POST query - SELECT Id, promotioncode__c FROM Subscription where PromotionCode__c = 'qwerty\"asdf\'zxcv\\1234'
  // NOTE for "zoql export" we don't escape anything, just double up on single quotes only. tested all june 2018

  case class TestQueryResponse(
      Id: String,
      PromotionCode__c: String,
  )

  implicit val reads = Json.reads[TestQueryResponse]

  def apply(zuoraQuerier: ZuoraQuerier)(testString: String): ClientFailableOp[List[TestQueryResponse]] = {

    for {
      subscriptionsQuery <- zoql"""
                select
                id,
                promotionCode__c
                from subscription
                where PromotionCode__c = $testString
                """
      queryResult <- zuoraQuerier[TestQueryResponse](subscriptionsQuery)
    } yield queryResult.records

  }

}
