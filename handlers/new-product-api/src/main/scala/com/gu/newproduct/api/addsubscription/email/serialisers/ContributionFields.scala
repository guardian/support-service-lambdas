package com.gu.newproduct.api.addsubscription.email.serialisers

import com.gu.newproduct.api.addsubscription.Formatters._
import com.gu.newproduct.api.addsubscription.email.ContributionsEmailData
import com.gu.newproduct.api.addsubscription.zuora.GetPaymentMethod.{DirectDebit, NonDirectDebitMethod, PaymentMethod}
import com.gu.newproduct.api.addsubscription.zuora.PaymentMethodType.PayPal
import com.gu.newproduct.api.productcatalog.Plan
import com.gu.newproduct.api.productcatalog.PlanId.{AnnualContribution, MonthlyContribution}
import play.api.libs.json.{Json, Writes}

import java.time.LocalDate
import java.time.format.DateTimeFormatter

object ContributionEmailDataSerialiser {
  implicit val writes: Writes[ContributionsEmailData] = (data: ContributionsEmailData) => {
    val fields: Map[String, String] = ContributionFields.serialise(data)
    Json.toJson(fields)
  }
}

object ContributionFields {

  private val firstPaymentDateFormat = DateTimeFormatter.ofPattern("EEEE, d MMMM yyyy")

  private def paymentMethodFields(paymentMethod: PaymentMethod, firstPaymentDate: LocalDate) = paymentMethod match {
    case DirectDebit(status, accountName, accountNumberMask, sortCode, mandateId) =>
      Map(
        "bank_account_no" -> accountNumberMask.value,
        "bank_sort_code" -> sortCode.hyphenated,
        "account_holder" -> accountName.value,
        "mandate_id" -> mandateId.value,
        "payment_method" -> "Direct Debit",
        "first_payment_date" -> firstPaymentDate.format(firstPaymentDateFormat),
      )
    case NonDirectDebitMethod(status, paymentMethodType) if paymentMethodType == PayPal =>
      Map("payment_method" -> "PayPal")
    case _ => Map("payment_method" -> "credit / debit card")
  }

  def serialise(data: ContributionsEmailData): Map[String, String] = Map(
    "amount" -> data.amountMinorUnits.formatted,
    "currency" -> data.currency.glyph,
    "first_name" -> data.contacts.billTo.firstName.value,
  ) ++ paymentMethodFields(data.paymentMethod, data.firstPaymentDate)

}
