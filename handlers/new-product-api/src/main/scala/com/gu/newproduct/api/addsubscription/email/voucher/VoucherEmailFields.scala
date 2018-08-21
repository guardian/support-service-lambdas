package com.gu.newproduct.api.addsubscription.email.voucher

import java.time.LocalDate
import java.time.format.DateTimeFormatter

import com.gu.newproduct.api.addsubscription.zuora.GetPaymentMethod.{DirectDebit, NonDirectDebitMethod, PaymentMethod}
import com.gu.newproduct.api.addsubscription.Formatters._
import com.gu.newproduct.api.addsubscription.zuora.CreateSubscription.SubscriptionName
import com.gu.newproduct.api.addsubscription.zuora.GetContacts.Contacts
import com.gu.newproduct.api.addsubscription.zuora.PaymentMethodType
import com.gu.newproduct.api.addsubscription.zuora.PaymentMethodType._
import com.gu.newproduct.api.productcatalog.PlanId
import com.gu.newproduct.api.productcatalog.PlanId._

object VoucherEmailFields {


  val digipackPlans = List(VoucherWeekendPlus, VoucherEveryDayPlus, VoucherSixDayPlus, VoucherSundayPlus, VoucherSaturdayPlus)
  val dateformat = DateTimeFormatter.ofPattern("d MMMM yyyy")

  def apply(
    planId: PlanId,
    firstPaymentDate: LocalDate,
    firstPaperDate: LocalDate,
    subscriptionName: SubscriptionName,
    contacts: Contacts,
    paymentMethod: PaymentMethod) = {
    Map(
      "ZuoraSubscriberId" -> subscriptionName.value,
      "SubscriberKey" -> contacts.soldTo.email.map(_.value).getOrElse(""),
      "subscriber_id" -> subscriptionName.value,
      "IncludesDigipack" -> digipackPlans.contains(planId).toString,
      "date_of_first_paper" -> firstPaperDate.format(dateformat),
      "date_of_first_payment" -> firstPaymentDate.format(dateformat),
      "package" -> "", //todo same thing the wire catalog needs
      "subscription_rate" -> "" //todo this is the pricing that is displayed in the wire catalog
    ) ++ paymentMethodFields(paymentMethod) ++ addressFields(contacts)

  }


  def toDescription(methodType: PaymentMethodType) = methodType match {
    case CreditCardReferenceTransaction | CreditCard => "Credit/Debit Card"
    case BankTransfer => "Direct Debit"
    case PayPal => "PayPal"
    case Other => "" //should not happen
  }

  def paymentMethodFields(paymentMethod: PaymentMethod) = paymentMethod match {
    case DirectDebit(status, accountName, accountNumberMask, sortCode, mandateId) => Map(
      "bank_account_no" -> accountNumberMask.value,
      "bank_sort_code" -> sortCode.hyphenated,
      "account_holder" -> accountName.value,
      "mandate_id" -> mandateId.value,
      "payment_method" -> toDescription(BankTransfer)

    )
    case NonDirectDebitMethod(_, paymentMethodType) => Map(
      "payment_method" -> toDescription(paymentMethodType)
    )
  }

  def addressFields(contacts: Contacts) = Map(

    "title" -> "", //TODO
    "first_name" -> contacts.soldTo.firstName.value, //TODO should we use bill to or sold to for this?
    "last_name" -> contacts.soldTo.lastName.value, //TODO should we use bill to or sold to for this?
    "EmailAddress" -> contacts.soldTo.email.map(_.value).getOrElse(""), //TODO should we use bill to or sold to for this?

    "billing_address_line_1" -> "", //TODO
    "billing_address_line_2" -> "", //TODO
    "billing_address_town" -> "", //TODO
    "billing_county" -> "", //TODO
    "billing_postcode" -> "", //TODO
    "billing_country" -> contacts.billTo.country.map(_.name).getOrElse(""),

    "delivery_address_line_1" -> "", //TODO
    "delivery_address_line_2" -> "", //TODO
    "delivery_address_town" -> "", //TODO
    "delivery_county" -> "", //TODO
    "delivery_postcode" -> "", //TODO
    "delivery_country" -> contacts.soldTo.country.name
  )


}


// https://github.com/guardian/subscriptions-frontend/blob/207bb039ab4a26e6fa2cc23eb5d6b6d842d662df/app/model/exactTarget/DataExtensionRow.scala#L227



