package com.gu.creditprocessor

import com.gu.zuora.subscription.{Price, RatePlanChargeCode}
import com.typesafe.scalalogging.LazyLogging

trait ZuoraCreditAddResult extends LazyLogging {

  /** Unique code that identifies the rate plan charge added to the sub.
    */
  def chargeCode: RatePlanChargeCode

  /** Amount of credit.
    */
  def amountCredited: Price

  def logDiscrepancies(): Unit = ()
}
