package com.gu.zuora.retention.updateAccounts

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

  def apply(lines: Iterator[String], skipTo: Int): Try[AccountIdIterator] = {
    Try {
      val headers = lines.next()
      val accountIdLocation = headers.split(",").indexOf(accountIdHeader)
      new AccountIdIterator(lines.drop(skipTo), accountIdLocation, skipTo)
    }
  }
}
