package com.gu.util

import com.gu.effects.{RawEffects, S3ConfigLoad}
import com.gu.test.EffectsTest
import com.gu.util.config.{LoadConfig, Stage}
import com.gu.util.zuora.ZuoraQuery._
import com.gu.util.zuora.{RestRequestMaker, ZuoraQuery, ZuoraRestConfig, ZuoraRestRequestMaker}
import org.scalatest.{FlatSpec, Matchers}
import play.api.libs.json.{Json, Reads}
import scalaz.{\/, \/-}
import scalaz.syntax.std.either._

// run this manually
class ZuoraQueryEffectsTest extends FlatSpec with Matchers {

  case class StepsConfig(zuoraRestConfig: ZuoraRestConfig)

  implicit val stepsConfigReads: Reads[StepsConfig] = Json.reads[StepsConfig]

  it should "successfull query multiple accounts" taggedAs EffectsTest in {

    val actual = for {
      configAttempt <- S3ConfigLoad.load(Stage("DEV")).toEither.disjunction
      config <- LoadConfig.parseConfig[StepsConfig](configAttempt)
      zuoraQuerier = ZuoraQuery(ZuoraRestRequestMaker(RawEffects.response, config.stepsConfig.zuoraRestConfig))
      subs <- SubscriptionsForPromoCode(zuoraQuerier)("""qwerty"asdf'zxcv\1234""")
    } yield {
      subs
    }
    actual.map(_.map(_.PromotionCode__c)) should be(\/-(List("""qwerty"asdf'zxcv\1234""")))

  }

}
object SubscriptionsForPromoCode {

  //POST query - SELECT Id, promotioncode__c FROM Subscription where PromotionCode__c = 'qwerty\"asdf\'zxcv\\1234'
  // NOTE for "zoql export" we don't escape anything, just double up on single quotes only. tested all june 2018

  case class TestQueryResponse(
    Id: String,
    PromotionCode__c: String
  )

  implicit val reads = Json.reads[TestQueryResponse]

  def apply(zuoraQuerier: ZuoraQuerier)(testString: String): RestRequestMaker.ClientFail \/ List[TestQueryResponse] = {

    def searchForSubscriptions = {
      val subscriptionsQuery = zoql"""select
                                     | id,
                                     | promotionCode__c
                                     | from subscription
                                     | where PromotionCode__c = $testString
                                     |"""
        .stripMarginAndNewline
      zuoraQuerier[TestQueryResponse](subscriptionsQuery)
    }

    searchForSubscriptions.map(_.records)

  }

}
