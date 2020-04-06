package com.gu.newproduct.api.addsubscription.email

import java.time.LocalDate

import com.gu.i18n.Currency
import com.gu.newproduct.api.addsubscription.ZuoraAccountId
import com.gu.newproduct.api.addsubscription.zuora.CreateSubscription.SubscriptionName
import com.gu.newproduct.api.addsubscription.zuora.GetContacts.{BillToContact, Contacts, Email}
import com.gu.newproduct.api.addsubscription.zuora.GetPaymentMethod.PaymentMethod
import com.gu.newproduct.api.productcatalog.{AmountMinorUnits, Plan, PlanId}

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

case class ContributionsEmailData(
  accountId: ZuoraAccountId,
  currency: Currency,
  paymentMethod: PaymentMethod,
  amountMinorUnits: AmountMinorUnits,
  firstPaymentDate: LocalDate,
  plan: Plan,
  contacts: Contacts,
  created: LocalDate
) extends EmailData

case class GuardianWeeklyEmailData(
  currency: Currency,
  paymentMethod: PaymentMethod,
  firstPaymentDate: LocalDate,
  plan: Plan,
  contacts: Contacts
) extends EmailData

