package com.gu.autoCancel

import com.gu.autoCancel.ZuoraModels._
import org.joda.time.LocalDate
import play.api.libs.functional.syntax._
import play.api.libs.json.{ JsPath, Json, Reads, Writes }

object ZuoraModels {

  case class BasicAccountInfo(id: String, balance: Double)

  case class Subscription(id: String, status: String)

  case class Invoice(id: String, dueDate: LocalDate, balance: Double, status: String)

  case class AccountSummary(basicInfo: BasicAccountInfo, subscriptions: List[Subscription], invoices: List[Invoice])

  case class UpdateInvoiceResult(success: Boolean, id: String)

  case class CancelSubscriptionResult(success: Boolean, cancelledDate: LocalDate)

  case class UpdateSubscriptionResult(success: Boolean, subscriptionId: String)

  case class InvoiceUpdate(id: String, Status: String)

  case class SubscriptionCancellation(cancellationEffectiveDate: LocalDate)

  case class SubscriptionUpdate(cancellationReason: String)

}

object ZuoraReaders {

  implicit val basicAccountInfoReads: Reads[BasicAccountInfo] = (
    (JsPath \ "id").read[String] and
    (JsPath \ "balance").read[Double]
  )(BasicAccountInfo.apply _)

  implicit val subscriptionReads: Reads[Subscription] = (
    (JsPath \ "id").read[String] and
    (JsPath \ "status").read[String]
  )(Subscription.apply _)

  implicit val invoiceReads: Reads[Invoice] = (
    (JsPath \ "id").read[String] and
    (JsPath \ "dueDate").read[LocalDate] and
    (JsPath \ "balance").read[Double] and
    (JsPath \ "status").read[String]
  )(Invoice.apply _)

  implicit val accountSummaryReads: Reads[AccountSummary] = (
    (JsPath \ "basicInfo").read[BasicAccountInfo] and
    (JsPath \ "subscriptions").read[List[Subscription]] and
    (JsPath \ "invoices").read[List[Invoice]]
  )(AccountSummary.apply _)

  implicit val updateInvoiceResultReads: Reads[UpdateInvoiceResult] = (
    (JsPath \ "Success").read[Boolean] and
    (JsPath \ "Id").read[String]
  )(UpdateInvoiceResult.apply _)

  implicit val cancelSubscriptionResultReads: Reads[CancelSubscriptionResult] = (
    (JsPath \ "success").read[Boolean] and
    (JsPath \ "cancelledDate").read[LocalDate]
  )(CancelSubscriptionResult.apply _)

  implicit val updateSubscriptionResultReads: Reads[UpdateSubscriptionResult] = (
    (JsPath \ "success").read[Boolean] and
    (JsPath \ "subscriptionId").read[String]
  )(UpdateSubscriptionResult.apply _)

}

object ZuoraWriters {

  implicit val invoiceUpdateWrites = new Writes[InvoiceUpdate] {
    def writes(invoiceUpdate: InvoiceUpdate) = Json.obj(
      "Id" -> invoiceUpdate.id,
      "Status" -> invoiceUpdate.Status.toString
    )
  }

  implicit val subscriptionCancellationWrites = new Writes[SubscriptionCancellation] {
    def writes(subscriptionCancellation: SubscriptionCancellation) = Json.obj(
      "cancellationEffectiveDate" -> subscriptionCancellation.cancellationEffectiveDate,
      "cancellationPolicy" -> "SpecificDate",
      "invoiceCollect" -> false
    )
  }

  implicit val subscriptionUpdateResult = new Writes[SubscriptionUpdate] {
    def writes(subscriptionUpdate: SubscriptionUpdate) = Json.obj(
      "CancellationReason__c" -> subscriptionUpdate.cancellationReason
    )
  }

}
