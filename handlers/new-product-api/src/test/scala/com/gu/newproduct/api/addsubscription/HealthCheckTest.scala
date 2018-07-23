package com.gu.newproduct.api.addsubscription

import com.gu.i18n.Currency
import com.gu.newproduct.api.addsubscription.zuora.GetAccount.{Account, AccountBalanceMinorUnits, AutoPay, IdentityId}
import com.gu.util.resthttp.Types
import com.gu.util.resthttp.Types.ClientSuccess
import org.scalatest.{FlatSpec, Matchers}

class HealthCheckTest extends FlatSpec with Matchers {

  it should "pass" in {
    def getAccount(requestedAccountId: ZuoraAccountId): Types.ClientFailableOp[Account] = {
      requestedAccountId should be(ZuoraAccountId("accacc"))
      ClientSuccess(Account(Some(IdentityId("1313")), None, AutoPay(false), AccountBalanceMinorUnits(0), Currency.GBP))
    }

    HealthCheck(getAccount, AccountIdentitys.AccountIdentity(ZuoraAccountId("accacc"), IdentityId("1313"))).statusCode should be("200")
  }

  it should "fail" in {
    def getAccount(dontcare: ZuoraAccountId): Types.ClientFailableOp[Account] = {
      ClientSuccess(Account(Some(IdentityId("asdf")), None, AutoPay(false), AccountBalanceMinorUnits(0), Currency.GBP))
    }

    HealthCheck(getAccount, AccountIdentitys.AccountIdentity(ZuoraAccountId("accacc"), IdentityId("1313"))).statusCode should be("500")
  }

}
