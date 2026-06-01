package com.gu.newproduct.api.addsubscription.email.serialisers

import com.gu.newproduct.api.addsubscription.Formatters._
import com.gu.newproduct.api.addsubscription.DiscountMessage
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
    List(VoucherWeekendPlus, VoucherEveryDayPlus, VoucherSixDayPlus, VoucherSaturdayPlus)
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

    val paymentPLan = data.plan.paymentPlans.get(data.currency)

    Map(
      "subscriber_id" -> data.subscriptionName.value,
      "first_payment_date" -> data.firstPaymentDate.format(dateformat),
      "currency" -> data.currency.glyph,
      "subscription_rate" -> data.discountMessage
        .map(_.value)
        .getOrElse(paymentPLan.map(_.description).getOrElse("")),
    ) ++ paymentMethodFields(data.paymentMethod) ++ addressFields(data.contacts.billTo)

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

  def addressFields(contact: BillToContact) = {
    Map(
      "first_name" -> contact.firstName.value,
      "last_name" -> contact.lastName.value,
    )
  }
}
