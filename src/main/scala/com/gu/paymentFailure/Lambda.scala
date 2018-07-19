package com.gu.paymentFailure

import java.io.{InputStream, OutputStream}

import com.amazonaws.services.lambda.runtime.Context
import com.gu.effects.{GetFromS3, RawEffects}
import com.gu.util.apigateway.{ApiGatewayHandler, Auth}
import com.gu.util.apigateway.ApiGatewayHandler.LambdaIO
import com.gu.util.apigateway.Auth.TrustedApiConfig
import com.gu.util.config.ConfigReads.ConfigFailure
import com.gu.util.config.LoadConfigModule.StringFromS3
import com.gu.util.config._
import com.gu.util.exacttarget.{ETClient, EmailSendSteps, FilterEmail}
import com.gu.util.reader.Types._
import com.gu.util.zuora.{ZuoraGetInvoiceTransactions, ZuoraRestConfig, ZuoraRestRequestMaker}
import okhttp3.{Request, Response}
import scalaz.\/

object Lambda {

  def runForLegacyTestsSeeTestingMd(
    stage: Stage,
    fetchString: StringFromS3,
    response: Request => Response,
    lambdaIO: LambdaIO
  ): Unit = {
    val loadConfigModule = LoadConfigModule(stage, fetchString)
    ApiGatewayHandler(lambdaIO)(operationForEffects(loadConfigModule[TrustedApiConfig], wiredOperation(stage, response, loadConfigModule)))
  }

  def operationForEffects(
    loadConfigModule: ConfigFailure \/ TrustedApiConfig,
    wiredOperation: ApiGatewayOp[ApiGatewayHandler.Operation]
  ): ApiGatewayOp[ApiGatewayHandler.Operation] = {
    wiredOperation.map(_.prependRequestValidationToSteps(Auth(loadConfigModule)))
  }

  def wiredOperation(stage: Stage, response: Request => Response, loadConfigModule: LoadConfigModule.PartialApply): ApiGatewayOp[ApiGatewayHandler.Operation] = {
    for {
      zuoraRestConfig <- loadConfigModule[ZuoraRestConfig].toApiGatewayOp("load zuora config")
      etConfig <- loadConfigModule[ETConfig].toApiGatewayOp("load et config")
      // we probably shouldn't combine zuora tenant ids and auth keys into the same secrets file, are tenant ids even secret?
      trustedApiConfig <- loadConfigModule[TrustedApiConfig].toApiGatewayOp("load trusted Api config")

    } yield PaymentFailureSteps(
      ZuoraEmailSteps.sendEmailRegardingAccount(
        EmailSendSteps(ETClient.sendEmail(response, etConfig), FilterEmail(stage)),
        ZuoraGetInvoiceTransactions(ZuoraRestRequestMaker(response, zuoraRestConfig))
      ),
      etConfig.etSendIDs,
      trustedApiConfig
    )
  }

  // this is the entry point
  // it's referenced by the cloudformation so make sure you keep it in step
  // it's the only part you can't test of the handler
  def handleRequest(inputStream: InputStream, outputStream: OutputStream, context: Context): Unit =
    runForLegacyTestsSeeTestingMd(RawEffects.stage, GetFromS3.fetchString, RawEffects.response, LambdaIO(inputStream, outputStream, context))

}
