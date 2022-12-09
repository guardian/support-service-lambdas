package com.gu.newproduct.api.addsubscription.email.guardianweekly

import java.time.format.DateTimeFormatter

import com.gu.newproduct.api.addsubscription.email.EmailData.paymentMethodFields
import com.gu.newproduct.api.addsubscription.email.GuardianWeeklyEmailData
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

  def apply(data: GuardianWeeklyEmailData): Map[String, String] = Map(
    "EmailAddress" -> data.contacts.billTo.email.map(_.value).getOrElse(""),
    "first_name" -> data.contacts.soldTo.firstName.value,
    "last_name" -> data.contacts.soldTo.lastName.value,
    "delivery_address_line_1" -> data.contacts.soldTo.address.address1.map(_.value).getOrElse(""),
    "delivery_address_line_2" -> data.contacts.soldTo.address.address2.map(_.value).getOrElse(""),
    "delivery_address_town" -> data.contacts.soldTo.address.city.map(_.value).getOrElse(""),
    "delivery_postcode" -> data.contacts.soldTo.address.postcode.map(_.value).getOrElse(""),
    "delivery_country" -> data.contacts.soldTo.address.country.name,
    "ZuoraSubscriberId" -> data.subscriptionName.value,
    "subscriber_id" -> data.subscriptionName.value,
    "date_of_first_paper" -> data.firstPaymentDate.format(firstPaymentDateFormat),
    "date_of_first_payment" -> data.firstPaymentDate.format(firstPaymentDateFormat),
    "subscription_rate" -> data.plan.paymentPlans.get(data.currency).map(_.description).getOrElse(""),
  ) ++ paymentMethodFields(data.paymentMethod)

}
