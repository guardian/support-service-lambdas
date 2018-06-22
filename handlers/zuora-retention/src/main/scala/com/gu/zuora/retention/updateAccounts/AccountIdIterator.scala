package com.gu.zuora.retention.updateAccounts

import com.gu.util.handlers.LambdaException

import scala.util.Try
case class AccountId(value: String)
class AccountIdIterator(iterator: Iterator[String], accountIdLocation: Int, var currentPosition: Int) {

  def hasNext = iterator.hasNext

  def next: AccountId = {
    val line = iterator.next()
    currentPosition = currentPosition + 1
    val accountIdValue = line.split(",")(accountIdLocation)
    AccountId(accountIdValue)
  }
}

object AccountIdIterator {
  val accountIdHeader = "Account.Id"

  def apply(lines: Iterator[String], startingPosition: Int): Try[AccountIdIterator] = {
    Try {
      val headers = lines.next()
      val accountIdLocation = headers.split(",").indexOf(accountIdHeader)
      if (accountIdLocation < 0) throw new LambdaException(s"No $accountIdHeader column found in csv file header")
      new AccountIdIterator(lines.drop(startingPosition), accountIdLocation, startingPosition)
    }
  }
}
