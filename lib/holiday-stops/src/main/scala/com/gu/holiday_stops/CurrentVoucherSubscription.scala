package com.gu.holiday_stops

trait CurrentVoucherSubscription {
  def price: Double
  def billingPeriod: String
  def subscriptionNumber: String
}
