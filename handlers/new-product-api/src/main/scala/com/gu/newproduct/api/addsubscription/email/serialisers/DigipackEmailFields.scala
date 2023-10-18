package com.gu.newproduct.api.addsubscription.email.serialisers

import com.gu.newproduct.api.addsubscription.Formatters._
import com.gu.newproduct.api.addsubscription.email.DigipackEmailData
import com.gu.newproduct.api.addsubscription.email.EmailData._
import com.gu.newproduct.api.addsubscription.zuora.GetContacts.BillToContact
import com.gu.newproduct.api.addsubscription.zuora.GetPaymentMethod.{DirectDebit, NonDirectDebitMethod, PaymentMethod}
import com.gu.newproduct.api.addsubscription.zuora.PaymentMethodType._
import com.gu.newproduct.api.productcatalog.PlanId._
import com.gu.newproduct.api.productcatalog._
import play.api.libs.json.{Json, Writes}

import java.time.format.DateTimeFormatter

object DigipackEmailDataSerialiser {
  implicit val writes: Writes[DigipackEmailData] = (data: DigipackEmailData) => {
    val fields: Map[String, String] = DigipackEmailFields.serialise(data)
    Json.toJson(fields)
  }
}

object DigipackEmailFields {

  val digipackPlans =
    List(VoucherWeekendPlus, VoucherEveryDayPlus, VoucherSixDayPlus, VoucherSundayPlus, VoucherSaturdayPlus)
  val dateformat = DateTimeFormatter.ofPattern("d MMMM yyyy")

  def nounFor(billingPeriod: BillingPeriod) = billingPeriod match {
    case Monthly => "month"
    case Annual => "year"
    case Quarterly => "quarter"
    case SixWeeks => "six weeks"
  }
  def serialise(
      data: DigipackEmailData,
  ): Map[String, String] = {

    val emailAddress = data.contacts.billTo.email.map(_.value).getOrElse("")
    val paymentPLan = data.plan.paymentPlans.get(data.currency)

    Map(
      "ZuoraSubscriberId" -> data.subscriptionName.value,
      "SubscriberKey" -> emailAddress,
      "Subscription term" -> paymentPLan.map(plan => nounFor(plan.billingPeriod)).getOrElse(""),
      "Payment amount" -> paymentPLan.map(_.amountMinorUnits.formatted).getOrElse(""),
      "Date of first payment" -> data.firstPaymentDate.format(dateformat),
      "Currency" -> data.currency.glyph,
      "Trial period" -> data.trialPeriod.days.toString,
      "Subscription details" -> paymentPLan.map(_.description).getOrElse(""),
    ) ++ paymentMethodFields(data.paymentMethod) ++ addressFields(data.contacts.billTo)

  }

  def paymentMethodFields(paymentMethod: PaymentMethod) = paymentMethod match {
    case DirectDebit(status, accountName, accountNumberMask, sortCode, mandateId) =>
      Map(
        "Account number" -> accountNumberMask.value,
        "Sort Code" -> sortCode.hyphenated,
        "Account Name" -> accountName.value,
        "MandateID" -> mandateId.value,
        "Default payment method" -> toDescription(BankTransfer),
      )
    case NonDirectDebitMethod(_, paymentMethodType) =>
      Map(
        "Default payment method" -> toDescription(paymentMethodType),
      )
  }

  def addressFields(contact: BillToContact) = {
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
