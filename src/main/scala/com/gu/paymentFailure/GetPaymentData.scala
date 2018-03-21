package com.gu.paymentFailure

import com.gu.util.Logging
import com.gu.util.apigateway.ApiGatewayResponse.internalServerError
import com.gu.util.reader.Types.FailableOp
import com.gu.util.zuora.ZuoraGetInvoiceTransactions.{InvoiceItem, InvoiceTransactionSummary, ItemisedInvoice}
import java.time.LocalDate

import scalaz.\/
import scalaz.syntax.std.option._

object GetPaymentData extends Logging {

  case class PaymentFailureInformation(subscriptionName: String, product: String, amount: Double, serviceStartDate: LocalDate, serviceEndDate: LocalDate)

  //todo for now just return an option here but the error handling has to be refactored a little bit
  def apply(message: String)(invoiceTransactionSummary: InvoiceTransactionSummary): FailableOp[PaymentFailureInformation] = {
    logger.info(s"Attempting to get further details from account $message")
    val unpaidInvoices =
      invoiceTransactionSummary.invoices.filter {
        invoice => unpaid(invoice)
      }
    unpaidInvoices.headOption match {
      case Some(invoice) => {
        logger.info(s"Found the following unpaid invoice: $invoice")
        val positiveInvoiceItems = invoice.invoiceItems.filter(item => invoiceItemFilter(item))
        positiveInvoiceItems.headOption.map {
          item =>
            {
              val paymentFailureInfo = PaymentFailureInformation(item.subscriptionName, item.productName, invoice.amount, item.serviceStartDate, item.serviceEndDate)
              logger.info(s"Payment failure information for account: $message is: $paymentFailureInfo")
              paymentFailureInfo
            }
        }.toRightDisjunction(internalServerError(s"Could not retrieve additional data for account $message"))
      }
      case None => {
        logger.error(s"No unpaid invoice found - nothing to do")
        \/.left(internalServerError(s"Could not retrieve additional data for account $message"))
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
