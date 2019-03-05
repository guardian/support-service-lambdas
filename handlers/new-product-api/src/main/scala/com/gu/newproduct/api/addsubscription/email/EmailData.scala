package com.gu.newproduct.api.addsubscription.email

import java.time.LocalDate

import com.gu.i18n.Currency
import com.gu.newproduct.api.addsubscription.zuora.CreateSubscription.SubscriptionName
import com.gu.newproduct.api.addsubscription.zuora.GetContacts.{Contacts, Email}
import com.gu.newproduct.api.addsubscription.zuora.GetPaymentMethod.PaymentMethod
import com.gu.newproduct.api.productcatalog.Plan

sealed trait EmailData {
  def plan: Plan
  def destinationEmail: Option[Email]
}

case class PaperEmailData(
  plan: Plan,
  firstPaymentDate: LocalDate,
  firstPaperDate: LocalDate,
  subscriptionName: SubscriptionName,
  contacts: Contacts,
  paymentMethod: PaymentMethod,
  currency: Currency
) extends EmailData {
  override def destinationEmail: Option[Email] = contacts.soldTo.email
}

case class TrialPeriod(days: Int)

case class DigipackEmailData(
  plan: Plan,
  firstPaymentDate: LocalDate,
  subscriptionName: SubscriptionName,
  contacts: Contacts,
  paymentMethod: PaymentMethod,
  currency: Currency,
  trialPeriod: TrialPeriod
) extends EmailData {
  override def destinationEmail = contacts.billTo.email
}

