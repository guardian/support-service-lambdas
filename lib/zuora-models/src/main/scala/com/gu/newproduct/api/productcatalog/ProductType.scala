package com.gu.newproduct.api.productcatalog

/** ProductType Represents the ProductType field on a Product in Zuora
  */
case class ProductType(value: String)

object ProductType {
  val GuardianWeekly = ProductType("Guardian Weekly")
  val NewspaperVoucherBook = ProductType("Newspaper - Voucher Book")
  val NewspaperDigitalVoucher = ProductType("Newspaper - Digital Voucher")
  val NewspaperHomeDelivery = ProductType("Newspaper - Home Delivery")
  val NewspaperNationalDelivery = ProductType("Newspaper - National Delivery")
  val DigitalPack = ProductType("Digital Pack")
  val Contribution = ProductType("Contribution")
  val SupporterPlus = ProductType("Supporter Plus")
  val Membership = ProductType("Membership")
}
