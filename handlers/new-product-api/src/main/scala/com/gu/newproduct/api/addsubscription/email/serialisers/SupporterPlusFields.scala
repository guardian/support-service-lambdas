package com.gu.newproduct.api.addsubscription.email.serialisers

import com.gu.newproduct.api.addsubscription.Formatters._
import com.gu.newproduct.api.addsubscription.email.EmailData._
import com.gu.newproduct.api.addsubscription.email.SupporterPlusEmailData
import com.gu.newproduct.api.addsubscription.zuora.GetPaymentMethod.{DirectDebit, NonDirectDebitMethod, PaymentMethod}
import com.gu.newproduct.api.addsubscription.zuora.PaymentMethodType.BankTransfer
import com.gu.newproduct.api.productcatalog.Plan
import com.gu.newproduct.api.productcatalog.PlanId.{AnnualSupporterPlus, MonthlySupporterPlus}
import play.api.libs.json.{Json, Writes}

import java.time.LocalDate
import java.time.format.DateTimeFormatter

object SupporterPlusEmailDataSerialiser {
  implicit val writes: Writes[SupporterPlusEmailData] = (data: SupporterPlusEmailData) => {
    val fields: Map[String, String] = SupporterPlusFields.serialise(data)
    Json.toJson(fields)
  }
}

object SupporterPlusFields {

  val firstPaymentDateFormat = DateTimeFormatter.ofPattern("EEEE, d MMMM yyyy")

  def productId(plan: Plan) = plan.id match {
    case AnnualSupporterPlus => "annual-supporter-plus"
    case MonthlySupporterPlus => "monthly-supporter-plus"
    case other => other.name
  }

  def productFrequency(plan: Plan) = plan.id match {
    case AnnualSupporterPlus => "annual"
    case MonthlySupporterPlus => "month"
    case _ => ""
  }

  def paymentMethodFields(paymentMethod: PaymentMethod, firstPaymentDate: LocalDate) = paymentMethod match {
    case DirectDebit(status, accountName, accountNumberMask, sortCode, mandateId) =>
      Map(
        "account number" -> accountNumberMask.value,
        "sort code" -> sortCode.hyphenated,
        "account name" -> accountName.value,
        "Mandate ID" -> mandateId.value,
        "payment method" -> "Direct Debit",
        "first payment date" -> firstPaymentDate.format(firstPaymentDateFormat),
      )
    case NonDirectDebitMethod(_, paymentMethodType) =>
      Map(
        "payment method" -> toDescription(paymentMethodType),
        "first payment date" -> firstPaymentDate.format(firstPaymentDateFormat),
      )
  }

  def serialise(data: SupporterPlusEmailData): Map[String, String] = {

    val paymentDetails = data.amountMinorUnits.formatted + " " +data.currency.glyph +" per " + productFrequency(data.plan)
    Map(
      "ZuoraSubscriberId" -> data.subscriptionName.value,
      "EmailAddress" -> data.contacts.billTo.email.map(_.value).getOrElse(""),
      "created" -> data.created.toString,
      "amount" -> data.amountMinorUnits.formatted,
      "currency" -> data.currency.glyph,
      "edition" -> data.contacts.billTo.address.country.map(_.alpha2).getOrElse(""),
      "name" -> data.contacts.billTo.firstName.value,
      "product" -> productId(data.plan),
      "subscription details" -> data.discountMessage.map(_.value).getOrElse(paymentDetails),
    ) ++ paymentMethodFields(data.paymentMethod, data.firstPaymentDate)
  }

}
