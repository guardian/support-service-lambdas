package com.gu.util.zuora

import com.gu.util.zuora.ZuoraModels._
import org.joda.time.LocalDate
import play.api.libs.functional.syntax._
import play.api.libs.json._

object ZuoraModels {

  case class BasicAccountInfo(id: String, balance: Double)

  case class SubscriptionSummary(id: String, subscriptionNumber: String, status: String)

  case class Invoice(id: String, dueDate: LocalDate, balance: Double, status: String)

  case class AccountSummary(basicInfo: BasicAccountInfo, subscriptions: List[SubscriptionSummary], invoices: List[Invoice])

  case class InvoiceItem(id: String, subscriptionName: String, serviceStartDate: LocalDate, serviceEndDate: LocalDate, chargeAmount: Double, chargeName: String, productName: String)

  case class ItemisedInvoice(id: String, invoiceDate: LocalDate, amount: Double, balance: Double, status: String, invoiceItems: List[InvoiceItem])

  case class InvoiceTransactionSummary(invoices: List[ItemisedInvoice])

  case class CancelSubscriptionResult(cancelledDate: LocalDate)

  case class UpdateSubscriptionResult(subscriptionId: String)

  case class UpdateAccountResult()

  case class SubscriptionCancellation(cancellationEffectiveDate: LocalDate)

  case class SubscriptionUpdate(cancellationReason: String)

  case class AccountUpdate(autoPay: Boolean)

  case class ZuoraCommonFields(success: Boolean)

}

object ZuoraReaders {

  implicit val basicAccountInfoReads: Reads[BasicAccountInfo] = (
    (JsPath \ "id").read[String] and
    (JsPath \ "balance").read[Double]
  )(BasicAccountInfo.apply _)

  implicit val subscriptionSummaryReads: Reads[SubscriptionSummary] = (
    (JsPath \ "id").read[String] and
    (JsPath \ "subscriptionNumber").read[String] and
    (JsPath \ "status").read[String]
  )(SubscriptionSummary.apply _)

  implicit val invoiceReads: Reads[Invoice] = (
    (JsPath \ "id").read[String] and
    (JsPath \ "dueDate").read[LocalDate] and
    (JsPath \ "balance").read[Double] and
    (JsPath \ "status").read[String]
  )(Invoice.apply _)

  implicit val accountSummaryReads: Reads[AccountSummary] = (
    (JsPath \ "basicInfo").read[BasicAccountInfo] and
    (JsPath \ "subscriptions").read[List[SubscriptionSummary]] and
    (JsPath \ "invoices").read[List[Invoice]]
  )(AccountSummary.apply _)

  implicit val invoiceItemReads: Reads[InvoiceItem] = (
    (JsPath \ "id").read[String] and
    (JsPath \ "subscriptionName").read[String] and
    (JsPath \ "serviceStartDate").read[LocalDate] and
    (JsPath \ "serviceEndDate").read[LocalDate] and
    (JsPath \ "chargeAmount").read[Double] and
    (JsPath \ "chargeName").read[String] and
    (JsPath \ "productName").read[String]
  )(InvoiceItem.apply _)

  implicit val itemisedInvoiceReads: Reads[ItemisedInvoice] = (
    (JsPath \ "id").read[String] and
    (JsPath \ "invoiceDate").read[LocalDate] and
    (JsPath \ "amount").read[Double] and
    (JsPath \ "balance").read[Double] and
    (JsPath \ "status").read[String] and
    (JsPath \ "invoiceItems").read[List[InvoiceItem]]
  )(ItemisedInvoice.apply _)

  implicit val invoiceTransactionSummaryReads: Reads[InvoiceTransactionSummary] =
    (JsPath \ "invoices").read[List[ItemisedInvoice]].map {
      invoices => InvoiceTransactionSummary(invoices)
    }

  implicit val cancelSubscriptionResultReads: Reads[CancelSubscriptionResult] =
    (JsPath \ "cancelledDate").read[LocalDate].map(CancelSubscriptionResult.apply)

  implicit val updateSubscriptionResultReads: Reads[UpdateSubscriptionResult] =
    (JsPath \ "subscriptionId").read[String].map(UpdateSubscriptionResult.apply)

  implicit val updateAccountResultReads: Reads[UpdateAccountResult] = Reads(_ => JsSuccess(UpdateAccountResult()))

  implicit val zuoraCommonFieldsReads: Reads[ZuoraCommonFields] = (JsPath \ "success").read[Boolean].map {
    success => ZuoraCommonFields(success)
  }

}

object ZuoraWriters {

  implicit val subscriptionCancellationWrites = new Writes[SubscriptionCancellation] {
    def writes(subscriptionCancellation: SubscriptionCancellation) = Json.obj(
      "cancellationEffectiveDate" -> subscriptionCancellation.cancellationEffectiveDate,
      "cancellationPolicy" -> "SpecificDate",
      "invoiceCollect" -> false
    )
  }

  implicit val subscriptionUpdateWrites = new Writes[SubscriptionUpdate] {
    def writes(subscriptionUpdate: SubscriptionUpdate) = Json.obj(
      "CancellationReason__c" -> subscriptionUpdate.cancellationReason
    )
  }

  implicit val accountUpdateWrites = new Writes[AccountUpdate] {
    def writes(accountUpdate: AccountUpdate) = Json.obj(
      "autoPay" -> accountUpdate.autoPay
    )
  }

}
