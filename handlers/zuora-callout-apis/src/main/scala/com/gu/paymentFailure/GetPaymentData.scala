package com.gu.paymentFailure

import java.time.LocalDate

import com.gu.util.Logging
import com.gu.util.zuora.ZuoraGetInvoiceTransactions.{InvoiceItem, InvoiceTransactionSummary, ItemisedInvoice}

object GetPaymentData extends Logging {

  case class PaymentFailureInformation(subscriptionName: String, product: String, amount: Double, serviceStartDate: LocalDate, serviceEndDate: LocalDate)

  def apply(message: String)(invoiceTransactionSummary: InvoiceTransactionSummary): Either[String, PaymentFailureInformation] = {
    logger.info(s"Attempting to get further details from account $message")
    val unpaidInvoices =
      invoiceTransactionSummary.invoices.filter {
        invoice => unpaid(invoice)
      }
    unpaidInvoices.headOption match {
      case Some(invoice) => {
        logger.info(s"Found the following unpaid invoice: $invoice")
        val positiveInvoiceItems = invoice.invoiceItems.filter(item => invoiceItemFilter(item))
        // TODO payment failure may be subjected to invoice that have multiple items not only one
        // here we are generating PaymentFailureInformation base on the head of InvoiceItems
        val maybePaymentFailureInfo = positiveInvoiceItems.headOption.map {
          item =>
            {
              val paymentFailureInfo = PaymentFailureInformation(item.subscriptionName, item.productName, invoice.amount, item.serviceStartDate, item.serviceEndDate)
              logger.info(s"Payment failure information for account: $message is: $paymentFailureInfo")
              paymentFailureInfo
            }
        }
        maybePaymentFailureInfo.toRight(s"Could not retrieve additional data for account $message")
      }
      case None => {
        logger.error(s"No unpaid invoice found - nothing to do")
        Left(s"Could not retrieve additional data for account $message")
      }
    }
  }

  def unpaid(itemisedInvoice: ItemisedInvoice): Boolean = {
    itemisedInvoice.balance > 0 && itemisedInvoice.status == "Posted"
  }

  def invoiceItemFilter(item: InvoiceItem): Boolean = {
    item.chargeAmount > 0 // remove discounts, holiday credits and free products
  }

}
