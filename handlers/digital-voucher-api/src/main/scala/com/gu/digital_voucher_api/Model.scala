package com.gu.digital_voucher_api

case class SfSubscriptionId(value: String) extends AnyVal

case class RatePlanName(value: String) extends AnyVal

case class SchemeName(value: String) extends AnyVal

case class SubscriptionVouchers(cardCode: String, letterCode: String)
