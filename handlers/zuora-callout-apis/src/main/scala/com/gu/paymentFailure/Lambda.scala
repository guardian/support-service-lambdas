package com.gu.paymentFailure

import java.io.{InputStream, OutputStream}

import com.amazonaws.services.lambda.runtime.Context
import com.gu.effects.sqs.AwsSQSSend.{Payload, QueueName}
import com.gu.effects.sqs.SqsSync
import com.gu.effects.{GetFromS3, RawEffects}
import com.gu.util.apigateway.ApiGatewayHandler.LambdaIO
import com.gu.util.apigateway.Auth.TrustedApiConfig
import com.gu.util.apigateway.{ApiGatewayHandler, Auth}
import com.gu.util.config.ConfigReads.ConfigFailure
import com.gu.util.config.LoadConfigModule.StringFromS3
import com.gu.util.config._
import com.gu.util.email.EmailSendSteps
import com.gu.util.reader.Types._
import com.gu.util.zuora.{ZuoraGetInvoiceTransactions, ZuoraRestConfig, ZuoraRestRequestMaker}
import okhttp3.{Request, Response}

import scala.util.Try

object Lambda {

  def runForLegacyTestsSeeTestingMd(
      stage: Stage,
      fetchString: StringFromS3,
      response: Request => Response,
      lambdaIO: LambdaIO,
      sqsSend: QueueName => Payload => Try[Unit],
  ): Unit = {
    val loadConfigModule = LoadConfigModule(stage, fetchString)
    ApiGatewayHandler(lambdaIO)(
      operationForEffects(
        loadConfigModule[TrustedApiConfig],
        wiredOperation(stage, response, loadConfigModule, sqsSend),
      ),
    )
  }

  def operationForEffects(
      loadConfigModule: Either[ConfigFailure, TrustedApiConfig],
      wiredOperation: ApiGatewayOp[ApiGatewayHandler.Operation],
  ): ApiGatewayOp[ApiGatewayHandler.Operation] = {
    wiredOperation.map(_.prependRequestValidationToSteps(Auth(loadConfigModule)))
  }

  def wiredOperation(
      stage: Stage,
      response: Request => Response,
      loadConfigModule: LoadConfigModule.PartialApply,
      sqsSend: QueueName => Payload => Try[Unit],
  ): ApiGatewayOp[ApiGatewayHandler.Operation] = {
    for {
      zuoraRestConfig <- loadConfigModule[ZuoraRestConfig].toApiGatewayOp("load zuora config")
      // we probably shouldn't combine zuora tenant ids and auth keys into the same secrets file, are tenant ids even secret?
      trustedApiConfig <- loadConfigModule[TrustedApiConfig].toApiGatewayOp("load trusted Api config")

    } yield PaymentFailureSteps(
      ZuoraEmailSteps.sendEmailRegardingAccount(
        EmailSendSteps(sqsSend(emailQueueFor(stage))),
        ZuoraGetInvoiceTransactions(ZuoraRestRequestMaker(response, zuoraRestConfig)),
      ),
      trustedApiConfig,
    )
  }

  def emailQueueFor(stage: Stage): QueueName = stage match {
    case Stage("PROD") => QueueName("contributions-thanks")
    case _ => QueueName("contributions-thanks-dev")
  }

  // this is the entry point
  // it's referenced by the cloudformation so make sure you keep it in step
  // it's the only part you can't test of the handler
  def handleRequest(inputStream: InputStream, outputStream: OutputStream, context: Context): Unit = {
    runForLegacyTestsSeeTestingMd(
      RawEffects.stage,
      GetFromS3.fetchString,
      RawEffects.response,
      LambdaIO(inputStream, outputStream, context),
      SqsSync.send(SqsSync.buildClient),
    )
  }

}
