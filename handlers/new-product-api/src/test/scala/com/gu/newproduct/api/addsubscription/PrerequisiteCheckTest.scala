package com.gu.newproduct.api.addsubscription

import com.gu.newproduct.api.addsubscription.zuora.GetAccount._
import com.gu.util.zuora.RestRequestMaker.GenericError
import org.scalatest.{FlatSpec, Matchers}
import scalaz.{-\/, \/-}

class PrerequisiteCheckTest extends FlatSpec with Matchers {



  val account1 = AccountSummary(
    identityId = IdentityId("idAccount1"),
    paymentMethodId = PaymentMethodId("paymentIdAccount1"),
    autoPay = AutoPay(true),
    accountBalanceMinorUnits =  AccountBalanceMinorUnits(120)
  )

    val testAccounts = Map(
      "account1" -> account1
    )

  val check = PrerequesiteCheck(
    getAccount = getAccount
  ) _

  def getAccount(id: ZuoraAccountId) = testAccounts.get(id.value).map(\/-(_)).getOrElse(-\/(GenericError("invalid account")))

  it should "fail if account cannot be loaded" in {
    check(ZuoraAccountId("invalidAccount")) shouldBe -\/(GenericError("invalid account"))
  }

  it should "fail if account cannot be loaded" in {
    check(ZuoraAccountId("invalidAccount")) shouldBe -\/(GenericError("invalid account"))
  }

}
