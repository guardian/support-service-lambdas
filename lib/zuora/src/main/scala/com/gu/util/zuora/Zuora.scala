package com.gu.util.zuora

import java.time.LocalDate

import com.gu.util.zuora.RestRequestMaker.ClientFailableOp
import com.gu.util.zuora.ZuoraAccount.{AccountId, PaymentMethodId}
import com.gu.util.zuora.ZuoraModels._
import com.gu.util.zuora.ZuoraReaders._
import com.gu.util.zuora.internal.Types._
import play.api.libs.functional.syntax._
import play.api.libs.json.{JsPath, Json, Reads, Writes}
import scalaz.Reader

object ZuoraGetAccountSummary {

  case class BasicAccountInfo(id: AccountId, balance: Double, defaultPaymentMethod: PaymentMethodId)

  case class SubscriptionSummary(id: SubscriptionId, subscriptionNumber: String, status: String)

  case class Invoice(id: String, dueDate: LocalDate, balance: Double, status: String)

  case class AccountSummary(basicInfo: BasicAccountInfo, subscriptions: List[SubscriptionSummary], invoices: List[Invoice])

  implicit val basicAccountInfoReads: Reads[BasicAccountInfo] = (
    (JsPath \ "id").read[String].map(AccountId.apply) and
    (JsPath \ "balance").read[Double] and
    (JsPath \ "defaultPaymentMethod" \ "id").read[PaymentMethodId]
  )(BasicAccountInfo.apply _)

  implicit val invoiceReads: Reads[Invoice] = (
    (JsPath \ "id").read[String] and
    (JsPath \ "dueDate").read[LocalDate] and
    (JsPath \ "balance").read[Double] and
    (JsPath \ "status").read[String]
  )(Invoice.apply _)

  implicit val subscriptionSummaryReads: Reads[SubscriptionSummary] = (
    (JsPath \ "id").read[String].map(SubscriptionId.apply) and
    (JsPath \ "subscriptionNumber").read[String] and
    (JsPath \ "status").read[String]
  )(SubscriptionSummary.apply _)

  implicit val accountSummaryReads: Reads[AccountSummary] = (
    (JsPath \ "basicInfo").read[BasicAccountInfo] and
    (JsPath \ "subscriptions").read[List[SubscriptionSummary]] and
    (JsPath \ "invoices").read[List[Invoice]]
  )(AccountSummary.apply _)

  def apply(accountId: String): WithDepsClientFailableOp[ZuoraDeps, AccountSummary] =
    Reader { zuoraDeps: ZuoraDeps => ZuoraRestRequestMaker(zuoraDeps).get[AccountSummary](s"accounts/$accountId/summary") }.toEitherT

}

object ZuoraGetInvoiceTransactions {
  case class InvoiceItem(id: String, subscriptionName: String, serviceStartDate: LocalDate, serviceEndDate: LocalDate, chargeAmount: Double, chargeName: String, productName: String)

  case class ItemisedInvoice(id: String, invoiceDate: LocalDate, amount: Double, balance: Double, status: String, invoiceItems: List[InvoiceItem])

  case class InvoiceTransactionSummary(invoices: List[ItemisedInvoice])

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

  def apply(accountId: String): WithDepsClientFailableOp[ZuoraDeps, InvoiceTransactionSummary] =
    Reader { zuoraDeps: ZuoraDeps => ZuoraRestRequestMaker(zuoraDeps).get[InvoiceTransactionSummary](s"transactions/invoices/accounts/$accountId") }.toEitherT

}

object ZuoraCancelSubscription {

  case class SubscriptionCancellation(cancellationEffectiveDate: LocalDate)

  implicit val subscriptionCancellationWrites = new Writes[SubscriptionCancellation] {
    def writes(subscriptionCancellation: SubscriptionCancellation) = Json.obj(
      "cancellationEffectiveDate" -> subscriptionCancellation.cancellationEffectiveDate,
      "cancellationPolicy" -> "SpecificDate",
      "invoiceCollect" -> false
    )
  }

  def apply(subscription: SubscriptionId, cancellationDate: LocalDate): WithDepsClientFailableOp[ZuoraDeps, Unit] =
    Reader { zuoraDeps: ZuoraDeps => ZuoraRestRequestMaker(zuoraDeps).put(SubscriptionCancellation(cancellationDate), s"subscriptions/${subscription.id}/cancel"): ClientFailableOp[Unit] }.toEitherT

}

object ZuoraUpdateCancellationReason {

  case class SubscriptionUpdate(cancellationReason: String)

  implicit val subscriptionUpdateWrites = new Writes[SubscriptionUpdate] {
    def writes(subscriptionUpdate: SubscriptionUpdate) = Json.obj(
      "CancellationReason__c" -> subscriptionUpdate.cancellationReason
    )
  }

  def apply(subscription: SubscriptionId): WithDepsClientFailableOp[ZuoraDeps, Unit] =
    Reader { zuoraDeps: ZuoraDeps => ZuoraRestRequestMaker(zuoraDeps).put(SubscriptionUpdate("System AutoCancel"), s"subscriptions/${subscription.id}"): ClientFailableOp[Unit] }.toEitherT

}

object ZuoraDisableAutoPay {

  case class AccountUpdate(autoPay: Boolean)

  implicit val accountUpdateWrites = new Writes[AccountUpdate] {
    def writes(accountUpdate: AccountUpdate) = Json.obj(
      "autoPay" -> accountUpdate.autoPay
    )
  }

  def apply(accountId: String): WithDepsClientFailableOp[ZuoraDeps, Unit] =
    Reader { zuoraDeps: ZuoraDeps => ZuoraRestRequestMaker(zuoraDeps).put(AccountUpdate(autoPay = false), s"accounts/$accountId"): ClientFailableOp[Unit] }.toEitherT

}

