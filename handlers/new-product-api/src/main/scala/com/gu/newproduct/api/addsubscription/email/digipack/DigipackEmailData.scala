package com.gu.newproduct.api.addsubscription.email.digipack

import java.time.LocalDate
import java.time.format.DateTimeFormatter

import com.gu.i18n.Currency
import com.gu.newproduct.api.addsubscription.Formatters._
import com.gu.newproduct.api.addsubscription.zuora.CreateSubscription.SubscriptionName
import com.gu.newproduct.api.addsubscription.zuora.GetContacts.{BillToContact, Contacts}
import com.gu.newproduct.api.addsubscription.zuora.GetPaymentMethod.{DirectDebit, NonDirectDebitMethod, PaymentMethod}
import com.gu.newproduct.api.addsubscription.zuora.PaymentMethodType
import com.gu.newproduct.api.addsubscription.zuora.PaymentMethodType._
import com.gu.newproduct.api.productcatalog.Plan
import com.gu.newproduct.api.productcatalog.PlanId._
import play.api.libs.json.{Json, Writes}

case class DigipackEmailData(
  plan: Plan,
  firstPaymentDate: LocalDate,
  firstPaperDate: LocalDate,
  subscriptionName: SubscriptionName,
  contacts: Contacts,
  paymentMethod: PaymentMethod,
  currency: Currency
)

object DigipackEmailData {
  implicit val writes: Writes[DigipackEmailData] = (data: DigipackEmailData) => {
    val fields: Map[String, String] = PaperEmailFields(data)
    Json.toJson(fields)
  }
}

object PaperEmailFields {

  val digipackPlans = List(VoucherWeekendPlus, VoucherEveryDayPlus, VoucherSixDayPlus, VoucherSundayPlus, VoucherSaturdayPlus)
  val dateformat = DateTimeFormatter.ofPattern("d MMMM yyyy")

  def apply(
    data: DigipackEmailData
  ): Map[String, String] = {

    val emailAddress = data.contacts.billTo.email.map(_.value).getOrElse("")

  Map(
    "ZuoraSubscriberId" -> data.subscriptionName.value,
    "SubscriberKey" -> emailAddress,
    "Subscription term" -> "month",//todo (year or month)
    //"Payment amount" -> "16", // todo amount seems to not be used
    "Date of first payment" -> data.firstPaymentDate.format(dateformat),
    "Currency" -> data.currency.glyph,
    "Trial period" -> "5", //todo [number of trial days here]
    "Subscription details" -> data.plan.paymentPlans.get(data.currency).map(_.value).getOrElse("")
  )++ paymentMethodFields(data.paymentMethod) ++ addressFields(data.contacts.billTo)

  }

  def toDescription(methodType: PaymentMethodType) = methodType match {
    case CreditCardReferenceTransaction | CreditCard => "Credit/Debit Card"
    case BankTransfer => "Direct Debit"
    case PayPal => "PayPal"
    case Other => "" //should not happen
  }

  def paymentMethodFields(paymentMethod: PaymentMethod) = paymentMethod match {
    case DirectDebit(status, accountName, accountNumberMask, sortCode, mandateId) => Map(
      "Account number" -> accountNumberMask.value,
      "Sort Code" -> sortCode.hyphenated,
      "Account Name" -> accountName.value,
      "MandateID" -> mandateId.value,
      "Default payment method" -> toDescription(BankTransfer)
    )
    case NonDirectDebitMethod(_, paymentMethodType) => Map(
      "Default payment method" -> toDescription(paymentMethodType)
    )
  }

  def addressFields(contact:BillToContact) = {
    val address = contact.address
    Map(
      "First Name" -> contact.firstName.value,
      "Last Name" -> contact.lastName.value,
      "EmailAddress" -> contact.email.map(_.value).getOrElse(""),

      "Address 1" -> address.address1.map(_.value).getOrElse(""),
      "Address 2" -> address.address2.map(_.value).getOrElse(""),
      "City" -> address.city.map(_.value).getOrElse(""),
      "Post Code" -> address.postcode.map(_.value).getOrElse(""),
      "Country" -> address.country.map(_.name).getOrElse(""),
    )
  }
}

