package com.gu.autoCancel

import com.gu.util.apigateway.ApiGatewayResponse.noActionRequired
import com.gu.util.reader.Types.FailableOp

import scalaz.{ -\/, \/- }

object AutoCancelFilter {
  def apply(callout: AutoCancelCallout, onlyCancelDirectDebit: Boolean): FailableOp[Unit] = {
    for {
      _ <- filterAutoPay(callout)
      _ <- filterDirectDebit(onlyCancelDirectDebit = onlyCancelDirectDebit, nonDirectDebit = callout.nonDirectDebit)
    } yield ()
  }

  def filterAutoPay(callout: AutoCancelCallout): FailableOp[Unit] = {
    if (callout.isAutoPay) \/-(()) else -\/(noActionRequired("AutoPay is false"))
  }

  def filterDirectDebit(onlyCancelDirectDebit: Boolean, nonDirectDebit: Boolean): FailableOp[Unit] = {
    if (onlyCancelDirectDebit && nonDirectDebit)
      -\/(noActionRequired("it's not direct debit so we will wait longer"))
    else
      \/-(())
  }
}
