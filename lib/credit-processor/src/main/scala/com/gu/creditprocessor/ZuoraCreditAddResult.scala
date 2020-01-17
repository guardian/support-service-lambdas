package com.gu.creditprocessor

import com.gu.zuora.subscription.{AffectedPublicationDate, Price, RatePlanChargeCode, SubscriptionName}
import com.typesafe.scalalogging.LazyLogging

/**
 * Result of adding a credit amendment to a Zuora subscription.
 */
trait ZuoraCreditAddResult extends LazyLogging {

  def subscriptionName: SubscriptionName

  /**
   * Publication date that credit is in compensation for.
   */
  def pubDate: AffectedPublicationDate

  /**
   * Unique code that identifies the rate plan charge added to the sub.
   */
  def chargeCode: RatePlanChargeCode

  /**
   * Amount of credit.
   */
  def actualPrice: Price

  def logDiscrepancies(): Unit = ()
}
