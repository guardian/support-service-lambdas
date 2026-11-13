package com.gu.util.zuora

import com.gu.util.resthttp.RestRequestMaker.Requests
import com.gu.util.resthttp.Types.ClientFailableOp
import com.typesafe.scalalogging.LazyLogging
import play.api.libs.json.{Json, JsonValidationError, Reads}

final case class SubscriptionNumber(value: String) extends AnyVal

object SubscriptionNumber {
  implicit val reads: Reads[SubscriptionNumber] =
    Reads.StringReads
      .filter(JsonValidationError("Expected an alphanumeric subscription number with optional hyphens"))(
        _.matches("[A-Za-z0-9-]+"),
      )
      .map(SubscriptionNumber(_))
}

trait GetSubscriptionsOnInvoice {
  def getSubscriptionsOnInvoice(invoiceId: String): ClientFailableOp[List[SubscriptionNumber]]
}

class ZuoraGetSubsNamesOnInvoice(requests: Requests) extends GetSubscriptionsOnInvoice with LazyLogging {
  import ZuoraGetSubsNamesOnInvoice._

  override def getSubscriptionsOnInvoice(invoiceId: String): ClientFailableOp[List[SubscriptionNumber]] = {
    requests.get[InvoiceItems](s"invoices/$invoiceId/items").map { response =>
      val parsed = response.invoiceItems.map(_.subscriptionName).toSet
      logger.info(s"invoice unique subscriptions ids: $parsed")
      parsed.toList
    }
  }
}

object ZuoraGetSubsNamesOnInvoice {
  private case class InvoiceItem(subscriptionName: SubscriptionNumber)
  private case class InvoiceItems(invoiceItems: List[InvoiceItem])
  private implicit val invoiceItemReads: Reads[InvoiceItem] = Json.reads[InvoiceItem]
  private implicit val invoiceItemsReads: Reads[InvoiceItems] = Json.reads[InvoiceItems]
}
