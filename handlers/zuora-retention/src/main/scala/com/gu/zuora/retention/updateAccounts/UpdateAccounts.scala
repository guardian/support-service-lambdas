package com.gu.zuora.retention.updateAccounts

import com.gu.util.handlers.LambdaException
import com.gu.util.resthttp.Types.ClientFailableOp

import scala.util.Try

object UpdateAccounts {
  val oneMinuteMillis = 60000

  def apply(
      setDoNotProcess: AccountId => ClientFailableOp[Unit],
      getRemainingTimeInMillis: () => Int,
  )(uri: String, accountIdsIterator: AccountIdIterator): Try[UpdateAccountsResponse] = {

    Try {
      while (accountIdsIterator.hasNext && getRemainingTimeInMillis() > oneMinuteMillis) {
        val response = setDoNotProcess(accountIdsIterator.next)
        if (response.isFailure) {
          throw LambdaException(s"error response from lambda $response")
        }
      }

      if (accountIdsIterator.hasNext) {
        UpdateAccountsResponse(done = false, nextIndex = Some(accountIdsIterator.currentPosition), uri = uri)
      } else {
        UpdateAccountsResponse(done = true, nextIndex = None, uri = uri)
      }
    }
  }

}
