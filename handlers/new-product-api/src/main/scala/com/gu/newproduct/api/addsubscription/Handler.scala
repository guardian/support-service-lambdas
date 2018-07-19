package com.gu.newproduct.api.addsubscription

import java.io.{InputStream, OutputStream}

import com.amazonaws.services.lambda.runtime.Context
import com.gu.effects.{GetFromS3, RawEffects}
import com.gu.newproduct.api.addsubscription.TypeConvert._
import com.gu.newproduct.api.addsubscription.validation.{PrerequisiteCheck, ValidateAccount, ValidatePaymentMethod, ValidateSubscriptions}
import com.gu.newproduct.api.addsubscription.zuora.CreateSubscription.WireModel.{WireCreateRequest, WireSubscription}
import com.gu.newproduct.api.addsubscription.zuora.CreateSubscription.{CreateReq, SubscriptionName}
import com.gu.newproduct.api.addsubscription.zuora.GetAccount.WireModel.ZuoraAccount
import com.gu.newproduct.api.addsubscription.zuora.GetAccountSubscriptions.WireModel.ZuoraSubscriptionsResponse
import com.gu.newproduct.api.addsubscription.zuora.GetPaymentMethodStatus.PaymentMethodWire
import com.gu.newproduct.api.addsubscription.zuora.{CreateSubscription, GetAccount, GetAccountSubscriptions, GetPaymentMethodStatus}
import com.gu.util.Logging
import com.gu.util.apigateway.ApiGatewayHandler.{LambdaIO, Operation}
import com.gu.util.apigateway.ResponseModels.ApiResponse
import com.gu.util.apigateway.{ApiGatewayHandler, ApiGatewayRequest, ApiGatewayResponse}
import com.gu.util.config.LoadConfigModule.StringFromS3
import com.gu.util.config.{LoadConfigModule, Stage}
import com.gu.util.reader.Types._
import com.gu.util.resthttp.RestRequestMaker
import com.gu.util.resthttp.Types.ClientFailableOp
import com.gu.util.zuora.{ZuoraRestConfig, ZuoraRestRequestMaker}
import okhttp3.{Request, Response}

object Handler extends Logging {

  // Referenced in Cloudformation
  def apply(inputStream: InputStream, outputStream: OutputStream, context: Context): Unit =
    ApiGatewayHandler(LambdaIO(inputStream, outputStream, context)) {
      Steps.operationForEffects(RawEffects.response, RawEffects.stage, GetFromS3.fetchString)
    }

}

object Steps {

  def addSubscriptionSteps(
    prerequesiteCheck: ZuoraAccountId => ApiGatewayOp[Unit],
    createMonthlyContribution: CreateReq => ClientFailableOp[SubscriptionName]
  )(apiGatewayRequest: ApiGatewayRequest): ApiResponse = {
    (for {
      request <- apiGatewayRequest.bodyAsCaseClass[AddSubscriptionRequest]().withLogging("parsed request")
      _ <- prerequesiteCheck(request.zuoraAccountId)
      req = CreateReq(request.zuoraAccountId, request.amountMinorUnits, request.startDate, request.acquisitionCase)
      subscriptionName <- createMonthlyContribution(req).toApiGatewayOp("create monthly contribution")
    } yield ApiGatewayResponse(body = AddedSubscription(subscriptionName.value), statusCode = "200")).apiResponse
  }

  def operationForEffects(response: Request => Response, stage: Stage, fetchString: StringFromS3): ApiGatewayOp[Operation] =
    for {
      zuoraIds <- ZuoraIds.zuoraIdsForStage(stage)
      loadConfig = LoadConfigModule(stage, fetchString)
      zuoraConfig <- loadConfig[ZuoraRestConfig].toApiGatewayOp("load zuora config")
      zuoraClient = ZuoraRestRequestMaker(response, zuoraConfig)
      createMonthlyContribution = CreateSubscription(zuoraIds.monthly, zuoraClient.post[WireCreateRequest, WireSubscription]) _
      prerequesiteCheck = wiredPrereqCheck(zuoraIds, zuoraClient)
      configuredOp = Operation.noHealthcheck(
        steps = addSubscriptionSteps(prerequesiteCheck, createMonthlyContribution)
      )
    } yield configuredOp

  def wiredPrereqCheck(
    zuoraIds: ZuoraIds.ContributionsZuoraIds,
    zuoraClient: RestRequestMaker.Requests
  ): ZuoraAccountId => ApiGatewayOp[Unit] =
    PrerequisiteCheck(
      ValidateAccount(GetAccount(zuoraClient.get[ZuoraAccount])),
      ValidatePaymentMethod(GetPaymentMethodStatus(zuoraClient.get[PaymentMethodWire])),
      ValidateSubscriptions(
        GetAccountSubscriptions(zuoraClient.get[ZuoraSubscriptionsResponse]),
        List(zuoraIds.monthly.productRatePlanId, zuoraIds.annual.productRatePlanId)
      )
    )

}

