package com.gu.deliveryproblemcreditprocessor

import com.gu.creditprocessor.ZuoraCreditAddResult
import com.gu.zuora.subscription.{InvoiceDate, Price, RatePlanChargeCode}

case class DeliveryCreditResult(
    deliveryId: String,
    chargeCode: RatePlanChargeCode,
    amountCredited: Price,
    invoiceDate: InvoiceDate,
) extends ZuoraCreditAddResult
