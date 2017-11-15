package com.gu.autoCancel

import com.gu.autoCancel.AutoCancel.ACDeps
import com.gu.util.Logging
import com.gu.util.apigateway.ApiGatewayRequest
import com.gu.util.reader.Types._
import org.joda.time.LocalDate
import play.api.libs.json.Json

object AutoCancelSteps extends Logging {
  def apply(acDeps: ACDeps = ACDeps())(apiGatewayRequest: ApiGatewayRequest) = {
    for {
      autoCancelCallout <- Json.fromJson[AutoCancelCallout](Json.parse(apiGatewayRequest.body)).toFailableOp.toConfigHttpFailableOp
      _ <- AutoCancelFilter(autoCancelCallout, onlyCancelDirectDebit = apiGatewayRequest.onlyCancelDirectDebit).toConfigHttpFailableOp
      _ <- AutoCancel(LocalDate.now, autoCancelCallout, acDeps).withLogging(s"auto-cancellation for ${autoCancelCallout.accountId}")
    } yield ()
  }
}
