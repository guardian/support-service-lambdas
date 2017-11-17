package com.gu.autoCancel

import com.gu.autoCancel.AutoCancelFilter2.ACFilterDeps
import com.gu.paymentFailure.GetPaymentData.PaymentFailureInformation
import com.gu.paymentFailure.{ PaymentFailureCallout, PaymentFailureSteps, ToMessage }
import com.gu.util.{ ETConfig, Logging }
import com.gu.util.apigateway.ApiGatewayHandler.StageAndConfigHttp
import com.gu.util.apigateway.{ ApiGatewayRequest, ApiGatewayResponse }
import com.gu.util.exacttarget.EmailRequest
import com.gu.util.reader.Types._
import com.gu.util.zuora.ZuoraModels.SubscriptionId
import org.joda.time.LocalDate
import play.api.libs.json.Json

import scalaz.{ Reader, \/- }

object AutoCancelSteps extends Logging {

  def apply(acDeps: ACFilterDeps = ACFilterDeps())(apiGatewayRequest: ApiGatewayRequest): WithDepsFailableOp[StageAndConfigHttp, Unit] = {
    for {
      autoCancelCallout <- Json.fromJson[AutoCancelCallout](Json.parse(apiGatewayRequest.body)).toFailableOp.withLogging("zuora callout").toReader
      _ <- AutoCancelFilter(autoCancelCallout, onlyCancelDirectDebit = apiGatewayRequest.onlyCancelDirectDebit).toReader
      acRequest <- AutoCancelFilter2(LocalDate.now /*should be in effects package */ , autoCancelCallout, acDeps).withLogging(s"auto-cancellation filter for ${autoCancelCallout.accountId}")
      _ <- AutoCancel(acRequest).withLogging(s"auto-cancellation for ${autoCancelCallout.accountId}")
      //      _ <- PaymentFailureSteps.sendEmailSteps()(paymentFailureCallout(autoCancelCallout))
      request <- makeRequest(autoCancelCallout).local[StageAndConfigHttp](_.config.etConfig).toDepsFailableOp
      _ <- PaymentFailureSteps.sendEmailSteps()(autoCancelCallout.accountId, request)
    } yield ()
  }

  def makeRequest(autoCancelCallout: AutoCancelCallout): Reader[ETConfig, FailableOp[PaymentFailureInformation => EmailRequest]] = Reader { config =>
    \/-({ pFI: PaymentFailureInformation => EmailRequest(config.etSendIDs.cancelled, ToMessage(autoCancelCallout, pFI)) })

  }

}
