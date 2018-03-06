package com.gu.paymentFailure

import play.api.libs.functional.syntax._
import play.api.libs.json._

import scala.util.Try

case class BillingDetails(
  address1: Option[String],
  address2: Option[String],
  postCode: Option[String],
  city: Option[String],
  state: Option[String],
  country: Option[String])

object BillingDetails {

  implicit val jf: Reads[BillingDetails] = {
    (
      (JsPath \ "billToContactAddress1").readNullable[String] and
      (JsPath \ "billToContactAddress2").readNullable[String] and
      (JsPath \ "billToContactPostalCode").readNullable[String] and
      (JsPath \ "billToContactCity").readNullable[String] and
      (JsPath \ "billToContactState").readNullable[String] and
      (JsPath \ "billToContactCountry").readNullable[String]).apply(BillingDetails.apply _)
  }
}
case class PaymentFailureCallout(
  accountId: String,
  email: String,
  failureNumber: Int,
  firstName: String,
  lastName: String,
  paymentMethodType: String,
  creditCardType: String,
  creditCardExpirationMonth: String,
  creditCardExpirationYear: String,
  paymentId: String,
  currency: String,
  tenantId: String,
  billingDetails: BillingDetails)

object PaymentFailureCallout {

  implicit val jf: Reads[PaymentFailureCallout] = {
    (
      (JsPath \ "accountId").read[String] and
      (JsPath \ "email").read[String] and
      (JsPath \ "failureNumber").read[String].map(str => Try { Integer.parseInt(str) }).collect(JsonValidationError("int wasn't parsable"))({ case scala.util.Success(num) => num }) and
      (JsPath \ "firstName").read[String] and
      (JsPath \ "lastName").read[String] and
      (JsPath \ "paymentMethodType").read[String] and
      (JsPath \ "creditCardType").read[String] and
      (JsPath \ "creditCardExpirationMonth").read[String] and
      (JsPath \ "creditCardExpirationYear").read[String] and
      (JsPath \ "paymentId").read[String] and
      (JsPath \ "currency").read[String] and
      (JsPath \ "tenantId").read[String] and
      (JsPath).read[BillingDetails]).apply(PaymentFailureCallout.apply _)
  }
}
