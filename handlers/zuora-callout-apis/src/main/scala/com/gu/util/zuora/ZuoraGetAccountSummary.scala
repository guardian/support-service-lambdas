package com.gu.util.zuora

import java.time.LocalDate
import com.gu.util.resthttp.RestRequestMaker.Requests
import com.gu.util.resthttp.Types.{ClientFailableOp, ClientSuccess}
import com.gu.util.zuora.ZuoraGetAccountSummary.ZuoraAccount.{AccountId, PaymentMethodId}
import com.typesafe.scalalogging.LazyLogging
import play.api.libs.functional.syntax._
import play.api.libs.json._

object ZuoraGetAccountSummary extends LazyLogging {

  case class SubscriptionId(id: String) extends AnyVal

  object ZuoraAccount {

    case class SecondTokenId(value: String) extends AnyVal
    case class PaymentMethodId(value: String) extends AnyVal
    case class AccountId(value: String) extends AnyVal
    case class NumConsecutiveFailures(value: Int) extends AnyVal
    case class CreditCardExpirationMonth(value: Int) extends AnyVal
    case class CreditCardExpirationYear(value: Int) extends AnyVal
    case class CreditCardMaskNumber(value: String) extends AnyVal
    implicit val fPaymentMethodId: Format[PaymentMethodId] =
      Format[PaymentMethodId](JsPath.read[String].map(PaymentMethodId.apply), Writes { (o: PaymentMethodId) => JsString(o.value) })

    implicit val fAccountId: Format[AccountId] =
      Format[AccountId](JsPath.read[String].map(AccountId.apply), Writes { (o: AccountId) => JsString(o.value) })

    implicit val fNumConsecutiveFailures: Format[NumConsecutiveFailures] =
      Format[NumConsecutiveFailures](JsPath.read[Int].map(NumConsecutiveFailures.apply), Writes { (o: NumConsecutiveFailures) => JsNumber(o.value) })

  }

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

  def apply(requests: Requests)(accountId: String): ClientFailableOp[AccountSummary] =
    requests.get[AccountSummary](s"accounts/$accountId/summary")

  def dryRun(requests: Requests)(accountId: String): ClientFailableOp[AccountSummary] = {
    val msg = s"DryRun for ZuoraGetAccountSummary: ID $accountId"
    logger.info(msg)
    ClientSuccess(AccountSummary(basicInfo = BasicAccountInfo(id = AccountId(""), balance = 0, defaultPaymentMethod = PaymentMethodId("")), subscriptions = Nil, invoices = Nil))
  }
}
