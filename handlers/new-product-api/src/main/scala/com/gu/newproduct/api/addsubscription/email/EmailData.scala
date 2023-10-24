package com.gu.newproduct.api.addsubscription.email

import java.time.LocalDate

import com.gu.i18n.Currency
import com.gu.newproduct.api.addsubscription.Formatters._
import com.gu.newproduct.api.addsubscription.ZuoraAccountId
import com.gu.newproduct.api.addsubscription.zuora.CreateSubscription.SubscriptionName
import com.gu.newproduct.api.addsubscription.zuora.GetContacts.Contacts
import com.gu.newproduct.api.addsubscription.zuora.GetPaymentMethod.{DirectDebit, NonDirectDebitMethod, PaymentMethod}
import com.gu.newproduct.api.addsubscription.zuora.PaymentMethodType
import com.gu.newproduct.api.addsubscription.zuora.PaymentMethodType._
import com.gu.newproduct.api.productcatalog.{AmountMinorUnits, Plan}

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
    currency: Currency,
    deliveryAgentDetails: Option[DeliveryAgentDetails], // only for national delivery
) extends EmailData

case class DeliveryAgentDetails(
  agentName: String,
  telephone: String,
  email: String,
  address1: String,
  address2: String,
  town: String,
  county: String,
  postcode: String,
)

case class TrialPeriod(days: Int)

case class DigipackEmailData(
    plan: Plan,
    firstPaymentDate: LocalDate,
    subscriptionName: SubscriptionName,
    contacts: Contacts,
    paymentMethod: PaymentMethod,
    currency: Currency,
    trialPeriod: TrialPeriod,
) extends EmailData

case class SupporterPlusEmailData(
    accountId: ZuoraAccountId,
    currency: Currency,
    paymentMethod: PaymentMethod,
    amountMinorUnits: AmountMinorUnits,
    firstPaymentDate: LocalDate,
    plan: Plan,
    contacts: Contacts,
    created: LocalDate,
) extends EmailData

case class ContributionsEmailData(
    accountId: ZuoraAccountId,
    currency: Currency,
    paymentMethod: PaymentMethod,
    amountMinorUnits: AmountMinorUnits,
    firstPaymentDate: LocalDate,
    plan: Plan,
    contacts: Contacts,
    created: LocalDate,
) extends EmailData

case class GuardianWeeklyEmailData(
    currency: Currency,
    paymentMethod: PaymentMethod,
    firstPaymentDate: LocalDate,
    plan: Plan,
    contacts: Contacts,
    subscriptionName: SubscriptionName,
) extends EmailData

object EmailData {
  def toDescription(methodType: PaymentMethodType) = methodType match {
    case CreditCardReferenceTransaction | CreditCard => "Credit/Debit Card"
    case BankTransfer => "Direct Debit"
    case PayPal => "PayPal"
    case Other => "" // should not happen
  }

  def paymentMethodFields(paymentMethod: PaymentMethod) = paymentMethod match {
    case DirectDebit(status, accountName, accountNumberMask, sortCode, mandateId) =>
      Map(
        "bank_account_no" -> accountNumberMask.value,
        "bank_sort_code" -> sortCode.hyphenated,
        "account_holder" -> accountName.value,
        "mandate_id" -> mandateId.value,
        "payment_method" -> toDescription(BankTransfer),
      )
    case NonDirectDebitMethod(_, paymentMethodType) =>
      Map(
        "payment_method" -> toDescription(paymentMethodType),
      )
  }
}
