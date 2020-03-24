package com.gu.autoCancel

import java.time.LocalDate

import com.gu.autoCancel.MultiAutoCancel.AutoCancelRequest
import com.gu.util.reader.Types._
import com.gu.util.resthttp.Types.ClientSuccess
import com.gu.util.zuora.ZuoraGetAccountSummary.ZuoraAccount.{AccountId, PaymentMethodId}
import com.gu.util.zuora.ZuoraGetAccountSummary.{AccountSummary, BasicAccountInfo, Invoice, SubscriptionId, SubscriptionSummary}
import org.scalatest._

class AutoCancelRequestsProducerTest extends FlatSpec with Matchers {

  private val basicInfo = BasicAccountInfo(AccountId("id123"), 11.99, PaymentMethodId("pmid"))
  private val subscription = SubscriptionSummary(SubscriptionId("sub123"), "A-S123", "Active")
  private val singleOverdueInvoice = Invoice("inv123", LocalDate.now.minusDays(14), 11.99, "Posted")

  "auto cancel filter 2" should "cancel attempt" in {
    val autoCancelReqestsProducer = AutoCancelRequestsProducer(
      now = LocalDate.now,
      getAccountSummary = _ => ClientSuccess(AccountSummary(basicInfo, List(subscription), List(singleOverdueInvoice))),
      getInvoiceItems = _ => ClientSuccess(List(SubscriptionId("sub123")))
    ) _
    val autoCancelCallout = AutoCancelHandlerTest.fakeCallout(true)

    val actual: ApiGatewayOp[List[AutoCancelRequest]] = autoCancelReqestsProducer(autoCancelCallout)

    val expected = Right(
      List(AutoCancelRequest("id123", SubscriptionId("sub123"), LocalDate.now.minusDays(14)))
    )

    actual.toDisjunction should be(expected)
  }

}
