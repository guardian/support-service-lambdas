package com.gu.newproduct.api.addsubscription.zuora

import com.gu.newproduct.api.addsubscription.ZuoraAccountId
import com.gu.newproduct.api.addsubscription.zuora.GetAccount.WireModel.ZuoraAccount
import com.gu.newproduct.api.addsubscription.zuora.GetAccount._
import com.gu.util.zuora.RestRequestMaker.{GenericError, RequestsGet, WithoutCheck}
import org.scalatest.{FlatSpec, Matchers}
import scalaz.{-\/, \/-}

class GetAccountTest extends FlatSpec with Matchers {

  val acc: ZuoraAccount = ZuoraAccount(
    IdentityId__c = Some("6002"),
    DefaultPaymentMethodId = Some("2c92c0f8649cc8a60164a2bfd475000c"),
    AutoPay = false,
    Balance = 24.55
  )

  val missingFieldsAccount: ZuoraAccount = ZuoraAccount(
    IdentityId__c = None,
    DefaultPaymentMethodId = None,
    AutoPay = true,
    Balance = 11.99
  )
  val accF: RequestsGet[ZuoraAccount] = {
    case ("object/account/2c92c0f9624bbc5f016253e573970b16", WithoutCheck) => \/-(acc)
    case ("object/account/missingFieldsAccount", WithoutCheck) => \/-(missingFieldsAccount)
    case _ => -\/(GenericError("bad request"))
  }

  it should "get account as object" in {

    val actual = GetAccount(accF)(ZuoraAccountId("2c92c0f9624bbc5f016253e573970b16"))
    actual shouldBe \/-(Account(
      Some(IdentityId("6002")),
      Some(PaymentMethodId("2c92c0f8649cc8a60164a2bfd475000c")),
      AutoPay(false),
      AccountBalanceMinorUnits(2455)
    ))
  }

  it should "deserialise accounts with missing identity id or default payment method" in {
    val actual = GetAccount(accF)(ZuoraAccountId("missingFieldsAccount"))
    actual shouldBe \/-(Account(
      None,
      None,
      AutoPay(true),
      AccountBalanceMinorUnits(1199)
    ))
  }
}

