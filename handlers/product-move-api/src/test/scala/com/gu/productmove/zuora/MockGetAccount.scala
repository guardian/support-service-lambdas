package com.gu.productmove.zuora

import com.gu.productmove.zuora.GetAccount.PaymentMethodResponse
import zio.{IO, ZIO}

class MockGetAccount(accountResponse: Map[String, GetAccount.GetAccountResponse], paymentResponse: Map[String, PaymentMethodResponse]) extends GetAccount {

  private var mutableStore: List[String] = Nil // we need to remember the side effects

  def requests = mutableStore.reverse

  override def get(accountNumber: String): IO[String, GetAccount.GetAccountResponse] = {
    mutableStore = accountNumber :: mutableStore

    accountResponse.get(accountNumber) match
      case Some(stubbedResponse) => ZIO.succeed(stubbedResponse)
      case None => ZIO.fail(s"success = false, subscription not found: $accountNumber")
  }

  override def getPaymentMethod(paymentMethodId: String): IO[String, PaymentMethodResponse] = {
    mutableStore = paymentMethodId :: mutableStore

    paymentResponse.get(paymentMethodId) match
      case Some(stubbedResponse) => ZIO.succeed(stubbedResponse)
      case None => ZIO.fail(s"success = false, subscription not found: $paymentMethodId")
  }
}

object MockGetAccount {
  def requests: ZIO[MockGetAccount, Nothing, List[String]] = ZIO.serviceWith[MockGetAccount](_.requests)
}
