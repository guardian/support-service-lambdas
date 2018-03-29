package com.gu.stripeCustomerSourceUpdated.zuora

import com.gu.util.ZuoraToApiGateway
import com.gu.util.reader.Types._
import com.gu.util.zuora.ZuoraAccount.{AccountId, PaymentMethodId}
import com.gu.util.zuora.{ZuoraDeps, ZuoraRestRequestMaker}
import com.gu.util.zuora.ZuoraReaders.unitReads
import play.api.libs.json.{Json, Writes}
import scalaz.Reader

object SetDefaultPaymentMethod {

  case class SetDefaultPaymentMethod(paymentMethodId: PaymentMethodId)

  implicit val writes = new Writes[SetDefaultPaymentMethod] {
    def writes(subscriptionUpdate: SetDefaultPaymentMethod) = Json.obj(
      "DefaultPaymentMethodId" -> subscriptionUpdate.paymentMethodId
    )
  }

  def setDefaultPaymentMethod(accountId: AccountId, paymentMethodId: PaymentMethodId): WithDepsFailableOp[ZuoraDeps, Unit] =
    Reader { zuoraDeps: ZuoraDeps => ZuoraRestRequestMaker(zuoraDeps).put(SetDefaultPaymentMethod(paymentMethodId), s"object/account/${accountId.value}").leftMap(ZuoraToApiGateway.fromClientFail) }.toEitherT

}
