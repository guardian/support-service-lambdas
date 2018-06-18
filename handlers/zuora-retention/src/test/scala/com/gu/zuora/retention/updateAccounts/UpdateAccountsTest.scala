package com.gu.zuora.retention.updateAccounts

import com.gu.util.handlers.LambdaException
import com.gu.util.zuora.RestRequestMaker.{ClientFailableOp, GenericError}
import org.scalatest.{FlatSpec, Matchers}
import scalaz.{-\/, \/-}

import scala.util.{Failure, Success}

class UpdateAccountsTest extends FlatSpec with Matchers {

  def successZuoraUpdate(AccountId: String): ClientFailableOp[Unit] = \/-(())

  it should "process all accounts if there is enough execution time left" in {

    val linesIterator = List("Account.Id", "firstAccount", "secondAccount", "thirdAccount").iterator
    val responses = List(120000, 110000, 75000).iterator

    def getRemainingTime() = responses.next()

    val response = UpdateAccounts(successZuoraUpdate, getRemainingTime)(AccountIdIterator(linesIterator, 0).get)
    response shouldBe Success(UpdateAccountsResponse(done = true, skipTo = -1))
  }

  it should "should stop iterating if there less than a minute left for the lambda to execute" in {
    val linesIterator = List("Account.Id", "firstAccount", "secondAccount", "thirdAccount").iterator
    val responses = List(120000, 65000, 50000).iterator

    def getRemainingTime() = responses.next()

    val response = UpdateAccounts(successZuoraUpdate, getRemainingTime)(AccountIdIterator(linesIterator, 0).get)
    response shouldBe Success(UpdateAccountsResponse(done = false, skipTo = 2))
  }

  it should "should return failure if zuora returns an error" in {
    def fakeZuoraUpdate(accountId: String) = {
      if (accountId == "secondAccount")
        -\/(GenericError("something failed!"))
      else \/-(())
    }

    val linesIterator = List("Account.Id", "firstAccount", "secondAccount", "thirdAccount").iterator
    val responses = List(120000, 110000, 75000).iterator

    def getRemainingTime() = responses.next()

    val response = UpdateAccounts(fakeZuoraUpdate, getRemainingTime)(AccountIdIterator(linesIterator, 0).get)
    response shouldBe Failure(LambdaException("error response from lambda -\\/(GenericError(something failed!))"))

  }

}
