package com.gu.zuora.retention.updateAccounts

import com.gu.util.handlers.LambdaException
import com.gu.util.zuora.RestRequestMaker.ClientFailableOp

import scala.util.Try

object UpdateAccounts {
  val oneMinuteMillis = 60000

  def apply(
    uri: String,
    setDoNotProcess: String => ClientFailableOp[Unit],
    getRemainingTimeInMillis: () => Int
  )(accountIdsIterator: AccountIdIterator) = {

    Try {
      while (accountIdsIterator.hasNext && getRemainingTimeInMillis() > oneMinuteMillis) {
        val response = setDoNotProcess(accountIdsIterator.next)
        if (response.isLeft) {
          throw LambdaException(s"error response from lambda $response")
        }
      }

      if (accountIdsIterator.hasNext) {
        UpdateAccountsResponse(done = false, skipTo = Some(accountIdsIterator.currentPosition), uri = uri)
      } else {
        UpdateAccountsResponse(done = true, skipTo = None, uri = uri)
      }
    }
  }

}

