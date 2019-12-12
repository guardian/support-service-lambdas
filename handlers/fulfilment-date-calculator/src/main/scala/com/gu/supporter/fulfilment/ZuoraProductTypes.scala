package com.gu.supporter.fulfilment

object ZuoraProductTypes {
  sealed case class ZuoraProductType(name: String)

  object NewspaperHomeDelivery extends ZuoraProductType("Newspaper - Home Delivery")
  object NewspaperVoucherBook extends ZuoraProductType("Newspaper - Voucher Book")
  object GuardianWeekly extends ZuoraProductType("Guardian Weekly")
}

