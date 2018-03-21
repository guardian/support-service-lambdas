package com.gu.autoCancel

import java.time.LocalDate

import com.gu.autoCancel.AutoCancel.AutoCancelRequest
import com.gu.paymentFailure.GetPaymentData.PaymentFailureInformation
import com.gu.paymentFailure.ZuoraEmailSteps.ZuoraEmailStepsDeps
import com.gu.paymentFailure.{ToMessage, ZuoraEmailSteps}
import com.gu.stripeCustomerSourceUpdated.SourceUpdatedSteps.StepsConfig
import com.gu.util.ETConfig.ETSendIds
import com.gu.util.apigateway.ApiGatewayHandler.Operation
import com.gu.util.apigateway.ApiGatewayRequest
import com.gu.util.exacttarget.EmailRequest
import com.gu.util.reader.Types._
import com.gu.util.zuora.ZuoraDeps
import com.gu.util.{Config, Logging}
import okhttp3.{Request, Response}
import play.api.libs.json.Json

import scalaz.\/-

object AutoCancelSteps extends Logging {

  object AutoCancelStepsDeps {
    def default(now: LocalDate, response: Request => Response, config: Config[StepsConfig]): AutoCancelStepsDeps = {
      val zuoraDeps = ZuoraDeps(response, config.stepsConfig.zuoraRestConfig)
      AutoCancelStepsDeps(
        AutoCancel.apply(zuoraDeps),
        AutoCancelDataCollectionFilter.apply(AutoCancelDataCollectionFilter.ACFilterDeps.default(now, zuoraDeps)),
        config.etConfig.etSendIDs,
        ZuoraEmailSteps.sendEmailRegardingAccount(ZuoraEmailStepsDeps.default(response, config))
      )
    }
  }

  case class AutoCancelStepsDeps(
    autoCancel: AutoCancelRequest => FailableOp[Unit],
    autoCancelFilter2: AutoCancelCallout => FailableOp[AutoCancelRequest],
    etSendIds: ETSendIds,
    sendEmailRegardingAccount: (String, PaymentFailureInformation => EmailRequest) => FailableOp[Unit]
  )

  def apply(deps: AutoCancelStepsDeps): Operation = Operation.noHealthcheck({ apiGatewayRequest: ApiGatewayRequest =>
    for {
      autoCancelCallout <- Json.fromJson[AutoCancelCallout](Json.parse(apiGatewayRequest.body)).toFailableOp.withLogging("zuora callout")
      _ <- AutoCancelInputFilter(autoCancelCallout, onlyCancelDirectDebit = apiGatewayRequest.onlyCancelDirectDebit)
      acRequest <- deps.autoCancelFilter2(autoCancelCallout).withLogging(s"auto-cancellation filter for ${autoCancelCallout.accountId}")
      _ <- deps.autoCancel(acRequest).withLogging(s"auto-cancellation for ${autoCancelCallout.accountId}")
      request <- makeRequest(deps.etSendIds, autoCancelCallout)
      _ <- deps.sendEmailRegardingAccount(autoCancelCallout.accountId, request)
    } yield ()
  })

  def makeRequest(etSendIds: ETSendIds, autoCancelCallout: AutoCancelCallout): FailableOp[PaymentFailureInformation => EmailRequest] = {
    \/-({ pFI: PaymentFailureInformation => EmailRequest(etSendIds.cancelled, ToMessage(autoCancelCallout, pFI)) })

  }

}
