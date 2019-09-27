package com.gu.holiday_stops.subscription

trait CurrentVoucherSubscription {
  def price: Double
  def billingPeriod: String
  def subscriptionNumber: String
}
