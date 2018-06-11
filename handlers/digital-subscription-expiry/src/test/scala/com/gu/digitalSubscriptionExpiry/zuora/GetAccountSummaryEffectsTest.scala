package com.gu.digitalSubscriptionExpiry.zuora
import com.gu.digitalSubscriptionExpiry.Handler.StepsConfig
import com.gu.digitalSubscriptionExpiry.zuora.GetAccountSummary.{AccountId, AccountSummaryResult}
import com.gu.effects.{RawEffects, S3ConfigLoad}
import com.gu.test.EffectsTest
import com.gu.util.config.{LoadConfig, Stage}
import com.gu.util.reader.Types.ApiGatewayOp.ContinueProcessing
import com.gu.util.reader.Types._
import com.gu.util.zuora.ZuoraRestRequestMaker
import org.scalatest.{FlatSpec, Matchers}

class GetAccountSummaryEffectsTest extends FlatSpec with Matchers {
  it should "successfully get account summary against dev" taggedAs EffectsTest in {
    val testAccountId = AccountId("2c92c0f86078c4d4016079e1402d6536")

    val actual: ApiGatewayOp[AccountSummaryResult] = for {
      configAttempt <- S3ConfigLoad.load(Stage("DEV")).toApiGatewayOp("load config")
      config <- LoadConfig.parseConfig[StepsConfig](configAttempt).toApiGatewayOp("parse config")
      zuoraRequests = ZuoraRestRequestMaker(RawEffects.response, config.stepsConfig.zuoraRestConfig)
      subscription <- GetAccountSummary(zuoraRequests)(testAccountId).toApiGatewayOp("get summary")
    } yield {
      subscription
    }

    val expected = AccountSummaryResult(
      accountId = testAccountId,
      billToLastName = "Brown",
      billToPostcode = Some("SW13 8EB"),
      soldToLastName = "Brown",
      soldToPostcode = Some("SW13 8EB")
    )

    actual should be(ContinueProcessing(expected))
  }
}
