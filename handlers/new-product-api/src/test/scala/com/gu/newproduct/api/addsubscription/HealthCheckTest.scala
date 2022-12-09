package com.gu.newproduct.api.addsubscription

import com.gu.i18n.Currency
import com.gu.newproduct.api.addsubscription.AccountIdentitys.HealthCheckTestAccountData
import com.gu.newproduct.api.addsubscription.zuora.GetAccount._
import com.gu.util.resthttp.Types
import com.gu.util.resthttp.Types.ClientSuccess
import org.scalatest.flatspec.AnyFlatSpec
import org.scalatest.matchers.should.Matchers

class HealthCheckTest extends AnyFlatSpec with Matchers {

  it should "pass" in {
    def getAccount(requestedAccountId: ZuoraAccountId): Types.ClientFailableOp[Account] = {
      requestedAccountId should be(ZuoraAccountId("accacc"))
      ClientSuccess(
        Account(
          Some(IdentityId("1313")),
          Some(SfContactId("1414")),
          None,
          AutoPay(false),
          AccountBalanceMinorUnits(0),
          Currency.GBP,
        ),
      )
    }

    val fakeTestData = HealthCheckTestAccountData(ZuoraAccountId("accacc"), IdentityId("1313"))
    HealthCheck(getAccount, fakeTestData).statusCode should be("200")
  }

  it should "fail" in {
    def getAccount(dontcare: ZuoraAccountId): Types.ClientFailableOp[Account] = {
      ClientSuccess(
        Account(
          Some(IdentityId("asdf")),
          Some(SfContactId("1414")),
          None,
          AutoPay(false),
          AccountBalanceMinorUnits(0),
          Currency.GBP,
        ),
      )
    }

    val fakeTestData = HealthCheckTestAccountData(ZuoraAccountId("accacc"), IdentityId("1313"))
    HealthCheck(getAccount, fakeTestData).statusCode should be("500")
  }

}
