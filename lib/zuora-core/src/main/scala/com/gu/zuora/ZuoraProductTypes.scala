package com.gu.zuora

object ZuoraProductTypes {
  sealed case class ZuoraProductType(name: String)

  // TODO this structure is duplicated in zuora-models "ProductType.scala", since zuora-models has no dependencies it should be imported here instead
  object NewspaperHomeDelivery extends ZuoraProductType("Newspaper - Home Delivery")
  object NewspaperVoucherBook extends ZuoraProductType("Newspaper - Voucher Book")
  object NewspaperDigitalVoucher extends ZuoraProductType("Newspaper - Digital Voucher")
  object NewspaperNationalDelivery extends ZuoraProductType("Newspaper - National Delivery")
  object GuardianWeekly extends ZuoraProductType("Guardian Weekly")
}
