package com.gu.productmove.zuora

import com.gu.productmove.endpoint.move.ProductMoveEndpointTypes.{ErrorResponse, InternalServerError}
import com.gu.productmove.zuora.GetAccount.PaymentMethodResponse
import com.gu.productmove.zuora.model.AccountNumber
import zio.*

class MockGetAccount(
    accountResponse: Map[AccountNumber, GetAccount.GetAccountResponse],
    paymentResponse: Map[String, PaymentMethodResponse],
) extends GetAccount {

  private var mutableStore: List[String | AccountNumber] = Nil // we need to remember the side effects

  def requests = mutableStore.reverse

  override def get(accountNumber: AccountNumber): Task[GetAccount.GetAccountResponse] = {
    mutableStore = accountNumber :: mutableStore

    accountResponse.get(accountNumber) match {
      case Some(stubbedResponse) => ZIO.succeed(stubbedResponse)
      case None => ZIO.fail(new Throwable(s"mock: success = false, getAccount: $accountNumber"))
    }
  }

  override def getPaymentMethod(paymentMethodId: String): Task[PaymentMethodResponse] = {
    mutableStore = paymentMethodId :: mutableStore

    paymentResponse.get(paymentMethodId) match {
      case Some(stubbedResponse) => ZIO.succeed(stubbedResponse)
      case None => ZIO.fail(new Throwable(s"mock: success = false, getPaymentMethod: $paymentMethodId"))
    }
  }
}

object MockGetAccount {
  def requests: ZIO[MockGetAccount, Nothing, List[String | AccountNumber]] = ZIO.serviceWith[MockGetAccount](_.requests)
}
