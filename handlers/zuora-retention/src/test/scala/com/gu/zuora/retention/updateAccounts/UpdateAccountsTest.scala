package com.gu.zuora.retention.updateAccounts

import com.gu.util.handlers.LambdaException
import com.gu.util.resthttp.Types.{ClientFailableOp, ClientSuccess, GenericError}

import scala.util.{Failure, Success}
import org.scalatest.flatspec.AnyFlatSpec
import org.scalatest.matchers.should.Matchers

class UpdateAccountsTest extends AnyFlatSpec with Matchers {
  val testUri = "someUri"
  def successZuoraUpdate(accountId: AccountId): ClientFailableOp[Unit] = ClientSuccess(())

  it should "process all accounts if there is enough execution time left" in {

    val linesIterator = List("Account.Id", "firstAccount", "secondAccount", "thirdAccount").iterator
    val remainingMsValues = List(120000, 110000, 75000).iterator

    def getRemainingTime() = remainingMsValues.next()

    val response =
      UpdateAccounts(successZuoraUpdate, getRemainingTime _)(testUri, AccountIdIterator(linesIterator, 0).get)
    response shouldBe Success(UpdateAccountsResponse(done = true, nextIndex = None, testUri))
  }

  it should "should stop iterating if there less than a minute left for the lambda to execute" in {
    val linesIterator = List("Account.Id", "firstAccount", "secondAccount", "thirdAccount").iterator
    val remainingMsValues = List(120000, 65000, 50000).iterator

    def getRemainingTime() = remainingMsValues.next()

    val response =
      UpdateAccounts(successZuoraUpdate, getRemainingTime _)(testUri, AccountIdIterator(linesIterator, 0).get)
    response shouldBe Success(UpdateAccountsResponse(done = false, nextIndex = Some(2), testUri))
  }

  it should "should return failure if zuora returns an error" in {
    def fakeZuoraUpdate(accountId: AccountId) = {
      if (accountId.value == "secondAccount")
        GenericError("something failed!")
      else ClientSuccess(())
    }

    val linesIterator = List("Account.Id", "firstAccount", "secondAccount", "thirdAccount").iterator
    val remainingMsValues = List(120000, 110000, 75000).iterator

    def getRemainingTime() = remainingMsValues.next()

    val response = UpdateAccounts(fakeZuoraUpdate, getRemainingTime _)(testUri, AccountIdIterator(linesIterator, 0).get)
    // this test is a bit specific, no need to check the exact message
    response shouldBe Failure(LambdaException("error response from lambda GenericError(something failed!)"))

  }
}
