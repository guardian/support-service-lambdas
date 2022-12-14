package com.gu.newproduct.api.addsubscription.zuora

import com.gu.i18n.Currency.GBP
import com.gu.newproduct.api.addsubscription.ZuoraAccountId
import com.gu.newproduct.api.addsubscription.zuora.GetAccount.WireModel.ZuoraAccount
import com.gu.newproduct.api.addsubscription.zuora.GetAccount._
import com.gu.util.resthttp.RestRequestMaker.{RequestsGet, WithoutCheck}
import com.gu.util.resthttp.Types.{ClientSuccess, GenericError}
import org.scalatest.flatspec.AnyFlatSpec
import org.scalatest.matchers.should.Matchers

class GetAccountTest extends AnyFlatSpec with Matchers {

  val acc: ZuoraAccount = ZuoraAccount(
    IdentityId__c = Some("6002"),
    DefaultPaymentMethodId = Some("2c92c0f8649cc8a60164a2bfd475000c"),
    AutoPay = false,
    Balance = 24.55,
    Currency = "GBP",
    sfContactId__c = Some("sfContactId"),
  )
  it should "get account as object" in {

    val accF: RequestsGet[ZuoraAccount] = {
      case ("object/account/2c92c0f9624bbc5f016253e573970b16", WithoutCheck) => ClientSuccess(acc)
      case in => GenericError(s"bad request: $in")
    }
    val actual = GetAccount(accF)(ZuoraAccountId("2c92c0f9624bbc5f016253e573970b16"))
    actual shouldBe ClientSuccess(
      Account(
        Some(IdentityId("6002")),
        Some(SfContactId("sfContactId")),
        Some(PaymentMethodId("2c92c0f8649cc8a60164a2bfd475000c")),
        AutoPay(false),
        AccountBalanceMinorUnits(2455),
        GBP,
      ),
    )
  }

  it should "deserialise accounts with missing identity id or default payment method" in {
    val missingFieldsAccount = acc.copy(IdentityId__c = None, DefaultPaymentMethodId = None, sfContactId__c = None)
    val accF: RequestsGet[ZuoraAccount] = {
      case ("object/account/missingFieldsAccount", WithoutCheck) => ClientSuccess(missingFieldsAccount)
      case in => GenericError(s"bad request: $in")
    }
    val actual = GetAccount(accF)(ZuoraAccountId("missingFieldsAccount"))
    actual shouldBe ClientSuccess(
      Account(
        None,
        None,
        None,
        AutoPay(false),
        AccountBalanceMinorUnits(2455),
        GBP,
      ),
    )
  }
  it should "return error if Account has unknown currencyu" in {
    val unknownCurrencyAccount = acc.copy(Currency = "unknown currency code here")
    val accF: RequestsGet[ZuoraAccount] = {
      case ("object/account/id", WithoutCheck) => ClientSuccess(unknownCurrencyAccount)
      case in => GenericError(s"bad request: $in")
    }
    val actual = GetAccount(accF)(ZuoraAccountId("id"))
    actual.isFailure shouldBe (true)
  }
}
