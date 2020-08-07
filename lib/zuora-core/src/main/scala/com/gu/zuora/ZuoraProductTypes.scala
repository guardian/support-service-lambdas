package com.gu.zuora

object ZuoraProductTypes {
  sealed case class ZuoraProductType(name: String)

  object NewspaperHomeDelivery extends ZuoraProductType("Newspaper - Home Delivery")
  object NewspaperVoucherBook extends ZuoraProductType("Newspaper - Voucher Book")
  object NewspaperDigitalVoucher extends ZuoraProductType("Newspaper - Digital Voucher")
  object GuardianWeekly extends ZuoraProductType("Guardian Weekly")
}
