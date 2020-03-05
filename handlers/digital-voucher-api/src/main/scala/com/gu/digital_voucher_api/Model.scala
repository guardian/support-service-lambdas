package com.gu.digital_voucher_api

case class SfSubscriptionId(value: String) extends AnyVal

case class RatePlanName(value: String) extends AnyVal

case class CampaignCode(value: String) extends AnyVal

case class CampaignCodeSet(card: CampaignCode, letter: CampaignCode)

case class SchemeName(value: String) extends AnyVal
