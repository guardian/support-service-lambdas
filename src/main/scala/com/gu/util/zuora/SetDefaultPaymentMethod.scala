package com.gu.util.zuora

import com.gu.util.reader.Types.WithDepsFailableOp
import com.gu.util.zuora.ZuoraQueryPaymentMethod.{ AccountId, PaymentMethodId }
import com.gu.util.zuora.ZuoraReaders.unitReads
import com.gu.util.zuora.ZuoraRestRequestMaker.put
import play.api.libs.json.{ Json, Writes }

object SetDefaultPaymentMethod {

  case class SetDefaultPaymentMethod(paymentMethodId: PaymentMethodId)

  implicit val writes = new Writes[SetDefaultPaymentMethod] {
    def writes(subscriptionUpdate: SetDefaultPaymentMethod) = Json.obj(
      "DefaultPaymentMethodId" -> subscriptionUpdate.paymentMethodId)
  }

  def setDefaultPaymentMethod(accountId: AccountId, paymentMethodId: PaymentMethodId): WithDepsFailableOp[ZuoraDeps, Unit] =
    put(SetDefaultPaymentMethod(paymentMethodId), s"object/account/${accountId.value}")

}
