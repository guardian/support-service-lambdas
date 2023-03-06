package com.gu.stripeCardUpdated.zuora

import com.gu.util.resthttp.RestRequestMaker.Requests
import com.gu.util.resthttp.Types.ClientFailableOp
import com.gu.util.zuora.ZuoraGetAccountSummary.ZuoraAccount.{AccountId, PaymentMethodId}
import play.api.libs.json.{JsSuccess, Json, Reads, Writes}

object SetDefaultPaymentMethod {

  case class SetDefaultPaymentMethod(paymentMethodId: PaymentMethodId)

  // FIXME create WireRequest and converter layer to replace the custom writes
  implicit val writes = new Writes[SetDefaultPaymentMethod] {
    def writes(subscriptionUpdate: SetDefaultPaymentMethod) = Json.obj(
      "DefaultPaymentMethodId" -> subscriptionUpdate.paymentMethodId,
    )
  }

  implicit val unitReads: Reads[Unit] =
    Reads(_ => JsSuccess(()))

  def setDefaultPaymentMethod(
      requests: Requests,
  )(accountId: AccountId, paymentMethodId: PaymentMethodId): ClientFailableOp[Unit] =
    requests.put(SetDefaultPaymentMethod(paymentMethodId), s"object/account/${accountId.value}")

}
