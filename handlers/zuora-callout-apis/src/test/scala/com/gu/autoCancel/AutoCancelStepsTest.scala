package com.gu.autoCancel

import java.time.LocalDate

import com.gu.autoCancel.AutoCancel.AutoCancelRequest
import com.gu.util.reader.Types._
import com.gu.util.resthttp.Types.ClientSuccess
import com.gu.util.zuora.SubscriptionNumber
import com.gu.util.zuora.ZuoraGetAccountSummary.ZuoraAccount.{AccountId, PaymentMethodId}
import com.gu.util.zuora.ZuoraGetAccountSummary.{AccountSummary, BasicAccountInfo, Invoice, SubscriptionId, SubscriptionSummary}
import org.scalatest._

class AutoCancelStepsTest extends FlatSpec with Matchers {

  private val basicInfo = BasicAccountInfo(AccountId("accId123"), 11.99, PaymentMethodId("pmid"))
  private val newSubscription = SubscriptionSummary(SubscriptionId("sub789"), "A-S789", "Active")
  private val invoiceDueMultipleSubscriptions = List(
    SubscriptionSummary(SubscriptionId("sub123"), "A-S123", "Active"),
    SubscriptionSummary(SubscriptionId("sub456"), "A-S456", "Active")
  )
  private val calloutInvoiceId = "inv123"
  private val twoOverdueInvoices = List(
    Invoice("inv123", LocalDate.now.minusDays(14), 11.99, "Posted"),
    Invoice("inv321", LocalDate.now.minusDays(35), 11.99, "Posted")
  )

  it should "prepare correct AutoCancelRequests" in {
    val autoCancelReqestsProducer = AutoCancelDataCollectionFilter(
      now = LocalDate.now,
      getAccountSummary = _ => ClientSuccess(
        AccountSummary(basicInfo, invoiceDueMultipleSubscriptions ++ List(newSubscription), twoOverdueInvoices)
      ),
      getSubsNamesOnInvoice = _ => ClientSuccess(invoiceDueMultipleSubscriptions.map(s => SubscriptionNumber(s.subscriptionNumber)))
    ) _
    val autoCancelCallout = AutoCancelHandlerTest
      .fakeCallout(true)
      .copy(
        invoiceId = calloutInvoiceId,
        accountId = basicInfo.id.value
      )

    val actual: ApiGatewayOp[List[AutoCancelRequest]] = autoCancelReqestsProducer(autoCancelCallout)

    val expected = Right(
      List(
        AutoCancelRequest("accId123", SubscriptionNumber("A-S123"), LocalDate.now.minusDays(14)),
        AutoCancelRequest("accId123", SubscriptionNumber("A-S456"), LocalDate.now.minusDays(14))
      )
    )

    actual.toDisjunction should be(expected)
  }

}
