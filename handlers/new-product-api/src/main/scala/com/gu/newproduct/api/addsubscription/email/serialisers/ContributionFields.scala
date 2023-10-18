package com.gu.newproduct.api.addsubscription.email.serialisers

import com.gu.newproduct.api.addsubscription.Formatters._
import com.gu.newproduct.api.addsubscription.email.ContributionsEmailData
import com.gu.newproduct.api.addsubscription.zuora.GetPaymentMethod.{DirectDebit, PaymentMethod}
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

  val firstPaymentDateFormat = DateTimeFormatter.ofPattern("EEEE, d MMMM yyyy")

  def productId(plan: Plan) = plan.id match {
    case AnnualContribution => "annual-contribution"
    case MonthlyContribution => "monthly-contribution"
    case other => other.name
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
    case _ => Map.empty

  }

  def serialise(data: ContributionsEmailData): Map[String, String] = Map(
    "EmailAddress" -> data.contacts.billTo.email.map(_.value).getOrElse(""),
    "created" -> data.created.toString,
    "amount" -> data.amountMinorUnits.formatted,
    "currency" -> data.currency.glyph,
    "edition" -> data.contacts.billTo.address.country.map(_.alpha2).getOrElse(""),
    "name" -> data.contacts.billTo.firstName.value,
    "product" -> productId(data.plan),
  ) ++ paymentMethodFields(data.paymentMethod, data.firstPaymentDate)

}
