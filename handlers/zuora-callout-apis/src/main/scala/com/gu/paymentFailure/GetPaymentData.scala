package com.gu.paymentFailure

import java.time.LocalDate

import com.gu.util.Logging
import com.gu.util.zuora.ZuoraGetInvoiceTransactions.{InvoiceItem, InvoiceTransactionSummary, ItemisedInvoice}

object GetPaymentData extends Logging {

  case class PaymentFailureInformation(
      subscriptionName: String,
      product: String,
      serviceStartDate: LocalDate,
      serviceEndDate: LocalDate,
  )

  def apply(
      message: String,
  )(invoiceTransactionSummary: InvoiceTransactionSummary): Either[String, PaymentFailureInformation] = {
    logger.info(s"Attempting to get further details from account $message")
    val positiveInvoices = invoiceTransactionSummary.invoices.filter(isPositive)
    positiveInvoices.headOption match {
      case Some(invoice) =>
        logger.info(s"Found the following positive invoice: $invoice")
        val positiveInvoiceItems = invoice.invoiceItems.filter(invoiceItemFilter)
        // TODO payment failure may be subjected to invoice that have multiple items not only one
        // here we are generating PaymentFailureInformation based on the head of InvoiceItems
        val maybePaymentFailureInfo = positiveInvoiceItems.headOption.map { item =>
          {
            val paymentFailureInfo = PaymentFailureInformation(
              item.subscriptionName,
              item.productName,
              item.serviceStartDate,
              item.serviceEndDate,
            )
            logger.info(s"Payment failure information for account: $message is: $paymentFailureInfo")
            paymentFailureInfo
          }
        }
        maybePaymentFailureInfo.toRight(s"Could not retrieve additional data for account $message")
      case None =>
        logger.error(s"No positive invoice found - nothing to do")
        Left(s"Could not retrieve additional data for account $message")
    }
  }

  def isPositive(itemisedInvoice: ItemisedInvoice): Boolean =
    itemisedInvoice.amount > 0 && itemisedInvoice.status == "Posted"

  def invoiceItemFilter(item: InvoiceItem): Boolean = {
    item.chargeAmount > 0 // remove discounts, holiday credits and free products
  }

}
