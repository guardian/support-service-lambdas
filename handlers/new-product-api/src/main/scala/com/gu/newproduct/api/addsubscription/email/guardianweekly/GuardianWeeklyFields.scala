package com.gu.newproduct.api.addsubscription.email.guardianweekly

import java.time.LocalDate
import java.time.format.DateTimeFormatter

import com.gu.newproduct.api.addsubscription.Formatters._
import com.gu.newproduct.api.addsubscription.email.{ContributionsEmailData, GuardianWeeklyEmailData}
import com.gu.newproduct.api.addsubscription.zuora.GetPaymentMethod.{DirectDebit, PaymentMethod}
import com.gu.newproduct.api.productcatalog.Plan
import com.gu.newproduct.api.productcatalog.PlanId.{AnnualContribution, MonthlyContribution}
import play.api.libs.json.{Json, Writes}

object GuardianWeeklyEmailDataSerialiser {
  implicit val writes: Writes[GuardianWeeklyEmailData] = (data: GuardianWeeklyEmailData) => {
    val fields: Map[String, String] = GuardianWeeklyFields(data)
    Json.toJson(fields)
  }
}

object GuardianWeeklyFields {

  val firstPaymentDateFormat = DateTimeFormatter.ofPattern("EEEE, d MMMM yyyy")

  def productId(plan: Plan) = plan.id match {
    case AnnualContribution => "annual-contribution"
    case MonthlyContribution => "monthly-contribution"
    case other => other.name
  }

  def paymentMethodFields(paymentMethod: PaymentMethod, firstPaymentDate: LocalDate) = paymentMethod match {
    case DirectDebit(status, accountName, accountNumberMask, sortCode, mandateId) => Map(
      "account number" -> accountNumberMask.value,
      "sort code" -> sortCode.hyphenated,
      "account name" -> accountName.value,
      "Mandate ID" -> mandateId.value,
      "payment method" -> "Direct Debit",
      "first payment date" -> firstPaymentDate.format(firstPaymentDateFormat)
    )
    case _ => Map.empty

  }

  def apply(data: GuardianWeeklyEmailData): Map[String, String] = Map(
    "EmailAddress" -> data.contacts.billTo.email.map(_.value).getOrElse(""),
    "currency" -> data.currency.glyph,
    "edition" -> data.contacts.billTo.address.country.map(_.alpha2).getOrElse(""),
    "name" -> data.contacts.billTo.firstName.value,
    "product" -> productId(data.plan)
  ) ++ paymentMethodFields(data.paymentMethod, data.firstPaymentDate)

}
