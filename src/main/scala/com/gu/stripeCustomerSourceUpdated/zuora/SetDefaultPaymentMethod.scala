package com.gu.stripeCustomerSourceUpdated.zuora

import com.gu.util.ZuoraToApiGateway
import com.gu.util.reader.Types._
import com.gu.util.zuora.RestRequestMaker.Requests
import com.gu.util.zuora.ZuoraGetAccountSummary.ZuoraAccount.{AccountId, PaymentMethodId}
import play.api.libs.json.{JsSuccess, Json, Reads, Writes}

object SetDefaultPaymentMethod {

  case class SetDefaultPaymentMethod(paymentMethodId: PaymentMethodId)

  // FIXME create WireRequest and converter layer to replace the custom writes
  implicit val writes = new Writes[SetDefaultPaymentMethod] {
    def writes(subscriptionUpdate: SetDefaultPaymentMethod) = Json.obj(
      "DefaultPaymentMethodId" -> subscriptionUpdate.paymentMethodId
    )
  }

  implicit val unitReads: Reads[Unit] =
    Reads(_ => JsSuccess(()))

  def setDefaultPaymentMethod(requests: Requests)(accountId: AccountId, paymentMethodId: PaymentMethodId): FailableOp[Unit] =
    requests.put(SetDefaultPaymentMethod(paymentMethodId), s"object/account/${accountId.value}").leftMap(ZuoraToApiGateway.fromClientFail)

}
