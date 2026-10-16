package com.gu.autoCancel

import com.gu.util.Logging
import com.gu.util.apigateway.ApiGatewayResponse.noActionRequired
import com.gu.util.reader.Types.ApiGatewayOp.{ContinueProcessing, ReturnWithResponse}
import com.gu.util.reader.Types._

object AutoCancelInputFilter extends Logging {
  def apply(callout: AutoCancelCallout, onlyCancelDirectDebit: Boolean): ApiGatewayOp[Unit] = {
    for {
      _ <- filterAutoPay(callout).withLogging("filter on auto pay")
      _ <- filterDirectDebit(onlyCancelDirectDebit = onlyCancelDirectDebit, nonDirectDebit = callout.nonDirectDebit)
        .withLogging("filter on direct debit")
    } yield ()
  }

  def filterAutoPay(callout: AutoCancelCallout): ApiGatewayOp[Unit] = {
    if (callout.isAutoPay) ContinueProcessing(()) else ReturnWithResponse(noActionRequired("AutoPay is false"))
  }

  def filterDirectDebit(onlyCancelDirectDebit: Boolean, nonDirectDebit: Boolean): ApiGatewayOp[Unit] = {
    if (onlyCancelDirectDebit && nonDirectDebit)
      ReturnWithResponse(noActionRequired("it's not direct debit so we will wait longer"))
    else
      ContinueProcessing(())
  }
}
