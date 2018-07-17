package com.gu.newproduct.api.addsubscription.zuora

import com.gu.newproduct.api.addsubscription.ZuoraAccountId
import com.gu.newproduct.api.addsubscription.zuora.GetAccount.WireModel.ZuoraAccount
import com.gu.newproduct.api.addsubscription.zuora.GetAccount._
import com.gu.util.zuora.RestRequestMaker.{GenericError, RequestsGet, WithoutCheck}
import org.scalatest.{FlatSpec, Matchers}
import scalaz.{-\/, \/-}

class GetAccountTest extends FlatSpec with Matchers {

  it should "get account as object" in {
    val acc: ZuoraAccount = ZuoraAccount(
      IdentityId__c = "6002",
      DefaultPaymentMethodId = "2c92c0f8649cc8a60164a2bfd475000c",
      AutoPay = false,
      Balance = 24.55
    )
    val accF: RequestsGet[ZuoraAccount] = {
      case ("object/account/2c92c0f9624bbc5f016253e573970b16", WithoutCheck) => \/-(acc)
      case _ => -\/(GenericError("bad request"))
    }
    val actual = GetAccount(accF)(ZuoraAccountId("2c92c0f9624bbc5f016253e573970b16"))
    actual shouldBe \/-(AccountSummary(
      IdentityId("6002"),
      PaymentMethodId("2c92c0f8649cc8a60164a2bfd475000c"),
      AutoPay(false),
      AccountBalanceMinorUnits(2455)
    ))
  }
}

