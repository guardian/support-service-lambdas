package com.gu.newproduct.api.addsubscription.validation

import com.gu.newproduct.api.addsubscription.ZuoraAccountId
import com.gu.newproduct.api.addsubscription.zuora.GetAccount.{Account, PaymentMethodId}
import com.gu.util.apigateway.ApiGatewayResponse.internalServerError
import com.gu.util.reader.Types.ApiGatewayOp.{ContinueProcessing, ReturnWithResponse}
import com.gu.util.reader.Types._
import com.gu.util.resthttp.Types.{ClientFailableOp, ClientSuccess, GenericError, NotFound}

object ValidateAccount extends Validation {
  def apply(getAccount: ZuoraAccountId => ClientFailableOp[Account])(accountId: ZuoraAccountId): ApiGatewayOp[PaymentMethodId] = {

    def accountFromZuora(id: ZuoraAccountId, IfNotFoundReturn: String) = getAccount(id) match {
      case NotFound(_) => ReturnWithResponse(errorResponse(IfNotFoundReturn))
      case GenericError(e) =>
        logger.error(s"error while getting zuora account: $e")
        ReturnWithResponse(internalServerError("error while getting zuora account"))
      case ClientSuccess(ac) => ContinueProcessing(ac)
    }

    for {
      account <- accountFromZuora(id = accountId, IfNotFoundReturn = "Zuora account id is not valid")
      _ <- check(account.identityId.isDefined, ifFalseReturn = "Zuora account has no Identity Id")
      _ <- check(account.autoPay.value, ifFalseReturn = "Zuora account has autopay disabled")
      _ <- check(account.accountBalanceMinorUnits.value == 0, ifFalseReturn = "Zuora account balance is not zero")
      paymentMethodId <- extract(account.paymentMethodId, ifNoneReturn = "Zuora account has no default payment method")
    } yield (paymentMethodId)
  }
}

