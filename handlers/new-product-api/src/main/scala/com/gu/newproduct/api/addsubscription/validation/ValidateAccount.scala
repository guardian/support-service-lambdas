package com.gu.newproduct.api.addsubscription.validation

import com.gu.newproduct.api.addsubscription.ZuoraAccountId
import com.gu.newproduct.api.addsubscription.zuora.GetAccount.{Account, PaymentMethodId}
import com.gu.util.apigateway.ApiGatewayResponse.internalServerError
import com.gu.util.reader.Types.ApiGatewayOp.{ContinueProcessing, ReturnWithResponse}
import com.gu.util.reader.Types._
import com.gu.util.resthttp.Types.{ClientFailableOp, ClientSuccess, GenericError, NotFound}
import Validation._
import com.gu.i18n.Currency

case class ValidatedAccount(paymentMethodId: PaymentMethodId, currency: Currency)

object ValidateAccount {
  def apply(getAccount: ZuoraAccountId => ClientFailableOp[Account])(accountId: ZuoraAccountId): ApiGatewayOp[ValidatedAccount] = {

    def accountFromZuora(id: ZuoraAccountId, IfNotFoundReturn: String) = getAccount(id) match {
      case NotFound(_) => errorResponse(IfNotFoundReturn)
      case GenericError(e) =>
        logger.error(s"error while getting zuora account: $e")
        ReturnWithResponse(internalServerError("error while getting zuora account"))
      case ClientSuccess(ac) => ContinueProcessing(ac)
    }

    for {
      account <- accountFromZuora(id = accountId, IfNotFoundReturn = "Zuora account id is not valid")
      _ <- account.identityId.isDefined ifFalseReturn "Zuora account has no Identity Id"
      _ <- account.autoPay.value ifFalseReturn "Zuora account has autopay disabled"
      _ <- (account.accountBalanceMinorUnits.value == 0) ifFalseReturn "Zuora account balance is not zero"
      paymentMethodId <- account.paymentMethodId getOrReturn "Zuora account has no default payment method"
    } yield (ValidatedAccount(paymentMethodId, account.currency))
  }
}

