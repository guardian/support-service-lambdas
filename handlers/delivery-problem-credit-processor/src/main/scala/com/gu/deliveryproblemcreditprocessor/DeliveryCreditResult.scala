package com.gu.deliveryproblemcreditprocessor

import java.time.LocalDate

import com.gu.creditprocessor.ZuoraCreditAddResult
import com.gu.zuora.subscription.{Price, RatePlanChargeCode}

case class DeliveryCreditResult(
  deliveryId: String,
  chargeCode: RatePlanChargeCode,
  amountCredited: Price,
  invoiceDate: LocalDate
) extends ZuoraCreditAddResult
