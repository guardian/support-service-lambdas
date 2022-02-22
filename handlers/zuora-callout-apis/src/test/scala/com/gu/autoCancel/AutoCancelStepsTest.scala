package com.gu.autoCancel

import com.gu.autoCancel.AutoCancel.AutoCancelRequest
import com.gu.util.reader.Types._
import com.gu.util.resthttp.Types.ClientSuccess
import com.gu.util.zuora.ZuoraGetAccountSummary.ZuoraAccount.{AccountId, PaymentMethodId}
import com.gu.util.zuora.ZuoraGetAccountSummary.{AccountSummary, BasicAccountInfo, Invoice, SubscriptionId, SubscriptionSummary}
import com.gu.util.zuora.{SubscriptionNumber, SubscriptionNumberWithStatus}
import org.scalatest.flatspec.AnyFlatSpec
import org.scalatest.matchers.should.Matchers

import java.time.LocalDate

class AutoCancelStepsTest extends AnyFlatSpec with Matchers {

  private val basicInfo = BasicAccountInfo(AccountId("accId123"), 11.99, PaymentMethodId("pmid"))
  private val invoiceDueMultipleSubscriptions = List(
    SubscriptionSummary(SubscriptionId("sub123"), "A-S123", "Active"),
    SubscriptionSummary(SubscriptionId("sub456"), "A-S456", "Active"),
    SubscriptionSummary(SubscriptionId("sub789"), "A-S789", "Cancelled") // for example if it was canceled manually after invoice was generated
  )
  private val subscriptionsNotOnInvoice = List(
    SubscriptionSummary(SubscriptionId("sub101112"), "A-S101112", "Active"),
    SubscriptionSummary(SubscriptionId("sub111213"), "A-S111213", "Active"),
    SubscriptionSummary(SubscriptionId("sub141516"), "A-S141516", "Active"),
    SubscriptionSummary(SubscriptionId("sub171819"), "A-S171819", "Active"),
  )

  private val allAccountSubs = invoiceDueMultipleSubscriptions ++ subscriptionsNotOnInvoice

  private val calloutInvoiceId = "inv123"
  private val twoOverdueInvoices = List(
    Invoice("inv123", LocalDate.now.minusDays(14), 11.99, "Posted"),
    Invoice("inv321", LocalDate.now.minusDays(35), 11.99, "Posted")
  )

  it should "prepare correct AutoCancelRequests" in {
    val autoCancelReqestsProducer = AutoCancelDataCollectionFilter(
      now = LocalDate.now,
      getAccountSummary = _ => ClientSuccess(
        AccountSummary(basicInfo, allAccountSubs, twoOverdueInvoices)
      ),
      getAccountSubscriptions = _ => ClientSuccess(
        allAccountSubs
          .map(s => SubscriptionNumberWithStatus(s.subscriptionNumber, s.status))
      ),
      getSubscriptionsOnInvoice = _ => ClientSuccess(invoiceDueMultipleSubscriptions.map(s => SubscriptionNumber(s.subscriptionNumber)))
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
        AutoCancelRequest("accId123", SubscriptionNumber("A-S123"), LocalDate.now.minusDays(14), "inv123", BigDecimal("11.99")),
        AutoCancelRequest("accId123", SubscriptionNumber("A-S456"), LocalDate.now.minusDays(14), "inv123", BigDecimal("11.99"))
      )
    )

    actual.toDisjunction should be(expected)
  }

}
