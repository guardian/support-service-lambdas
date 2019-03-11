package com.gu.newproduct.api.addsubscription.email

import java.time.LocalDate

import com.gu.i18n.Currency
import com.gu.newproduct.api.addsubscription.zuora.CreateSubscription.SubscriptionName
import com.gu.newproduct.api.addsubscription.zuora.GetContacts.{Contacts, Email}
import com.gu.newproduct.api.addsubscription.zuora.GetPaymentMethod.PaymentMethod
import com.gu.newproduct.api.productcatalog.Plan

sealed trait EmailData {
  def plan: Plan
  def contacts: Contacts
}

case class PaperEmailData(
  plan: Plan,
  firstPaymentDate: LocalDate,
  firstPaperDate: LocalDate,
  subscriptionName: SubscriptionName,
  contacts: Contacts,
  paymentMethod: PaymentMethod,
  currency: Currency
) extends EmailData

case class TrialPeriod(days: Int)

case class DigipackEmailData(
  plan: Plan,
  firstPaymentDate: LocalDate,
  subscriptionName: SubscriptionName,
  contacts: Contacts,
  paymentMethod: PaymentMethod,
  currency: Currency,
  trialPeriod: TrialPeriod
) extends EmailData

