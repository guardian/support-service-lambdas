package com.gu.deliveryproblemcreditprocessor

import com.gu.creditprocessor.ZuoraCreditAddResult
import com.gu.zuora.subscription.{Price, RatePlanChargeCode}

case class ZuoraDeliveryCreditAddResult(
    chargeCode: RatePlanChargeCode,
    amountCredited: Price
) extends ZuoraCreditAddResult
