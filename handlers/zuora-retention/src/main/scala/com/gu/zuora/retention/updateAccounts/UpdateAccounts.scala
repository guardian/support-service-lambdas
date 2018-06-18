package com.gu.zuora.retention.updateAccounts

import com.gu.util.handlers.LambdaException
import com.gu.util.zuora.RestRequestMaker.{ClientFailableOp, Requests}

import scala.util.Try

object UpdateAccounts {
  val oneMinuteMillis = 60000

  def apply(
    setDoNotProcess: String => ClientFailableOp[Unit],
    getRemainingTimeInMillis: () => Int
  )(accountIdsIterator: AccountIdIterator) = {

    //TODO THIS CODE IS NOT FUNCTIONAL AT ALL...
    Try {
      while (accountIdsIterator.hasNext && getRemainingTimeInMillis() > oneMinuteMillis) {
        val response = setDoNotProcess(accountIdsIterator.next)
        if (response.isLeft) {
          throw LambdaException(s"error response from lambda $response")
        }
      }

      if (accountIdsIterator.hasNext) {
        UpdateAccountsResponse(done = false, skipTo = accountIdsIterator.currentPosition)
      } else {
        UpdateAccountsResponse(done = true, skipTo = -1) //todo make skipToAnOption or something
      }
    }
  }

}

