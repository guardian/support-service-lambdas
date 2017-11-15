package com.gu.autoCancel

import com.gu.autoCancel.AutoCancel.ACDeps
import com.gu.util.apigateway.{ ApiGatewayRequest, URLParams }
import com.gu.util.exacttarget.TestingRawEffects
import com.gu.util.reader.Types.ConfigHttpFailableOp
import com.gu.util.zuora.ZuoraModels._
import org.joda.time.LocalDate
import org.scalatest._

class AutoCancelStepsTest extends FlatSpec with Matchers {

  val basicInfo = BasicAccountInfo("id123", 11.99)
  val subscription = SubscriptionSummary("id123", "A-S123", "Active")
  val singleOverdueInvoice = Invoice("inv123", LocalDate.now.minusDays(14), 11.99, "Posted")

  "auto cancel" should "turn off auto pay" in {
    var disableAutoPayAccountId: Option[String] = None
    def disableAutoPay(accountId: String): ConfigHttpFailableOp[UpdateAccountResult] = {
      disableAutoPayAccountId = Some(accountId)
      ConfigHttpFailableOp.lift(UpdateAccountResult())
    }
    val autoCancelJson =
      """
        |{"accountId": "AID", "autoPay": "true", "paymentMethodType": "GoldBars"}
      """.stripMargin // should probaly base on a real payload
    val fakeRequest = ApiGatewayRequest(Some(URLParams(None, None, Some("false"))), autoCancelJson)
    val aCDeps = ACDeps(
      disableAutoPay = disableAutoPay,
      getAccountSummary = _ => ConfigHttpFailableOp.lift(AccountSummary(basicInfo, List(subscription), List(singleOverdueInvoice))),
      updateCancellationReason = _ => ConfigHttpFailableOp.lift(UpdateSubscriptionResult("subid")),
      cancelSubscription = (_, _) => ConfigHttpFailableOp.lift(CancelSubscriptionResult(LocalDate.now))
    )
    AutoCancelSteps(aCDeps)(fakeRequest).run.run(new TestingRawEffects(false).configHttp)

    disableAutoPayAccountId should be(Some("AID"))
  }

}
