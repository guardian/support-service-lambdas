package com.gu.digitalSubscriptionExpiry.zuora

import com.gu.digitalSubscriptionExpiry.TypeConvert._
import com.gu.digitalSubscriptionExpiry.zuora.GetAccountSummary.{AccountId, AccountSummaryResult}
import com.gu.effects.{GetFromS3, RawEffects}
import com.gu.test.EffectsTest
import com.gu.util.config.{LoadConfigModule, Stage}
import com.gu.util.reader.Types.ApiGatewayOp.ContinueProcessing
import com.gu.util.reader.Types._
import com.gu.util.zuora.{ZuoraRestConfig, ZuoraRestRequestMaker}
import org.scalatest.flatspec.AnyFlatSpec
import org.scalatest.matchers.should.Matchers

class GetAccountSummaryEffectsTest extends AnyFlatSpec with Matchers {
  it should "successfully get account summary against dev" taggedAs EffectsTest in {
    val testAccountId = AccountId("2c92c0f86078c4d4016079e1402d6536")

    val actual: ApiGatewayOp[AccountSummaryResult] = for {
      zuoraRestConfig <- LoadConfigModule(Stage("DEV"), GetFromS3.fetchString)[ZuoraRestConfig]
        .toApiGatewayOp("parse config")

      zuoraRequests = ZuoraRestRequestMaker(RawEffects.response, zuoraRestConfig)
      subscription <- GetAccountSummary(zuoraRequests)(testAccountId).toApiGatewayOp("get summary")
    } yield {
      subscription
    }

    val expected = AccountSummaryResult(
      accountId = testAccountId,
      billToLastName = "Brown",
      billToPostcode = Some("SW13 8EB"),
      soldToLastName = "Brown",
      soldToPostcode = Some("SW13 8EB"),
      identityId = Some("30001864"),
    )

    actual should be(ContinueProcessing(expected))
  }
}
