package com.gu.zuora.subscription

case class ZuoraAccountBillingAndPayment(billCycleDay: Int)

case class ZuoraAccount(billingAndPayment: ZuoraAccountBillingAndPayment)
