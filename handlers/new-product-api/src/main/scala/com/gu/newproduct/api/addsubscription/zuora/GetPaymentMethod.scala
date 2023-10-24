package com.gu.newproduct.api.addsubscription.zuora

import com.gu.newproduct.api.addsubscription.zuora.GetAccount.PaymentMethodId
import com.gu.newproduct.api.addsubscription.zuora.PaymentMethodStatus.{ActivePaymentMethod, NotActivePaymentMethod}
import com.gu.newproduct.api.addsubscription.zuora.PaymentMethodType._
import com.gu.util.resthttp.RestRequestMaker.{RequestsGet, WithoutCheck}
import com.gu.util.resthttp.Types._
import play.api.libs.json._
import com.gu.newproduct.api.addsubscription.TypeConvert._
object GetPaymentMethod {

  case class PaymentMethodWire(
      PaymentMethodStatus: String,
      Type: String,
      MandateID: Option[String] = None,
      BankTransferAccountName: Option[String] = None,
      BankTransferAccountNumberMask: Option[String] = None,
      BankCode: Option[String] = None,
  ) {

    val stringToType = Map(
      "PayPal" -> PayPal,
      "CreditCard" -> CreditCard,
      "CreditCardReferenceTransaction" -> CreditCardReferenceTransaction,
      "BankTransfer" -> BankTransfer,
    )

    def toPaymentMethod: ClientFailableOp[PaymentMethod] = {
      val methodType = stringToType.getOrElse(Type, Other)
      if (methodType == BankTransfer) toDirectDebit
      else ClientSuccess(NonDirectDebitMethod(toStatus(PaymentMethodStatus), methodType))
    }

    private def toDirectDebit: ClientFailableOp[DirectDebit] = for {
      mandateId <- MandateID.toClientFailable("no MandateID in zuora direct debit", acceptablePaymentMethod = false)
      accountName <- BankTransferAccountName.toClientFailable(
        "no account name in zuora direct debit",
        acceptablePaymentMethod = false,
      )
      accountNumberMask <- BankTransferAccountNumberMask.toClientFailable(
        "no account number mask in zuora direct debit",
        acceptablePaymentMethod = false,
      )
      sortCode <- BankCode.toClientFailable("no bank code in zuora direct debit", acceptablePaymentMethod = false)
    } yield DirectDebit(
      toStatus(PaymentMethodStatus),
      BankAccountName(accountName),
      BankAccountNumberMask(accountNumberMask),
      SortCode(sortCode),
      MandateId(mandateId),
    )
  }

  private def toStatus(statusString: String) =
    if (statusString == "Active") ActivePaymentMethod else NotActivePaymentMethod

  implicit val wireReads: Reads[PaymentMethodWire] = Json.reads[PaymentMethodWire]

  sealed trait PaymentMethod {
    def status: PaymentMethodStatus

    def paymentMethodType: PaymentMethodType
  }

  case class BankAccountName(value: String) extends AnyVal

  case class BankAccountNumberMask(value: String) extends AnyVal

  case class SortCode(value: String) extends AnyVal

  case class MandateId(value: String) extends AnyVal

  case class DirectDebit(
      status: PaymentMethodStatus,
      accountName: BankAccountName,
      accountNumberMask: BankAccountNumberMask,
      sortCode: SortCode,
      mandateId: MandateId,
  ) extends PaymentMethod {
    val paymentMethodType = BankTransfer
  }

  case class NonDirectDebitMethod(status: PaymentMethodStatus, paymentMethodType: PaymentMethodType)
      extends PaymentMethod

  def apply(get: RequestsGet[PaymentMethodWire])(paymentMethodId: PaymentMethodId): ClientFailableOp[PaymentMethod] =
    get(s"object/payment-method/${paymentMethodId.value}", WithoutCheck).flatMap(_.toPaymentMethod)
}

sealed trait PaymentMethodType

object PaymentMethodType {
  val all = List(PayPal, CreditCard, CreditCardReferenceTransaction, BankTransfer, Other)

  case object PayPal extends PaymentMethodType

  case object CreditCard extends PaymentMethodType

  case object BankTransfer extends PaymentMethodType

  case object CreditCardReferenceTransaction extends PaymentMethodType

  case object Other extends PaymentMethodType

}

sealed trait PaymentMethodStatus

object PaymentMethodStatus {

  object ActivePaymentMethod extends PaymentMethodStatus

  object NotActivePaymentMethod extends PaymentMethodStatus

}
