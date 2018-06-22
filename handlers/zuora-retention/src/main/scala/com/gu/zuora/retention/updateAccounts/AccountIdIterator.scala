package com.gu.zuora.retention.updateAccounts

import com.gu.util.handlers.LambdaException

import scala.util.Try

class AccountIdIterator(iterator: Iterator[String], accountIdLocation: Int, var currentPosition: Int) {

  def hasNext = iterator.hasNext

  def next = {
    val line = iterator.next()
    currentPosition = currentPosition + 1
    val accountId = line.split(",")(accountIdLocation)
    accountId
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
