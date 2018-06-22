package com.gu.zuora.retention.updateAccounts

import com.gu.util.handlers.LambdaException
import org.scalatest.{FlatSpec, Matchers}
import scala.util.{Failure, Success}

class HandlerTest extends FlatSpec with Matchers {
  it should "detect if there was no progress made in api call" in {
    val request = UpdateAccountsRequest(uri = "someUri", nextIndex = Option(10))
    val noProgressResponse = UpdateAccountsResponse(uri = "someUri", nextIndex = Option(10), done = false)
    val noProgressError = Failure(LambdaException("no accounts processed in execution!"))

    Handler.failIfNoProgress(request, noProgressResponse) shouldBe (noProgressError)
  }

  it should "detect if there was no progress made in api call with no nextIndex param" in {
    val request = UpdateAccountsRequest(uri = "someUri", nextIndex = None)
    val noProgressResponse = UpdateAccountsResponse(uri = "someUri", nextIndex = None, done = false)
    val noProgressError = Failure(LambdaException("no accounts processed in execution!"))

    Handler.failIfNoProgress(request, noProgressResponse) shouldBe (noProgressError)
  }

  it should "validate when all accounts processed" in {
    val request = UpdateAccountsRequest(uri = "someUri", nextIndex = None)
    val noProgressResponse = UpdateAccountsResponse(uri = "someUri", nextIndex = None, done = true)
    Handler.failIfNoProgress(request, noProgressResponse) shouldBe (Success(()))
  }

  def s3Iterator(uri: String) = Success(List("Account.Id", "testAccountId").iterator)

  def updateAccounts(uri: String, accountIdIterator: AccountIdIterator) = {
    if (accountIdIterator.next == "testAccountId")
      Success(UpdateAccountsResponse(true, None, uri))
    else
      Failure(LambdaException("test: unexpected input params to fake updateAccounts"))
  }

  def operation = Handler.operation(s3Iterator, updateAccounts) _

  it should "execute operation" in {
    val updateAccountsRequest = UpdateAccountsRequest("someUri", None)
    operation(updateAccountsRequest) shouldBe (Success(UpdateAccountsResponse(true, None, "someUri")))
  }
}
