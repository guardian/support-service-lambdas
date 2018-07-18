package com.gu.stripeCustomerSourceUpdated

import com.gu.stripeCustomerSourceUpdated.StripeRequestSignatureChecker.verifyRequest
import com.gu.stripeCustomerSourceUpdated.TypeConvert._
import com.gu.stripeCustomerSourceUpdated.zuora.CreatePaymentMethod.{CreateStripePaymentMethod, CreditCardType}
import com.gu.stripeCustomerSourceUpdated.zuora.ZuoraQueryPaymentMethod.{AccountPaymentMethodIds, PaymentMethodFields}
import com.gu.stripeCustomerSourceUpdated.zuora.{CreatePaymentMethod, SetDefaultPaymentMethod, ZuoraQueryPaymentMethod}
import com.gu.util.Logging
import com.gu.util.apigateway.ApiGatewayHandler.Operation
import com.gu.util.apigateway.ApiGatewayResponse.unauthorized
import com.gu.util.apigateway.{ApiGatewayRequest, ApiGatewayResponse}
import com.gu.util.reader.Types.ApiGatewayOp._
import com.gu.util.reader.Types._
import com.gu.util.resthttp.RestRequestMaker.Requests
import com.gu.util.zuora.ZuoraGetAccountSummary.AccountSummary
import com.gu.util.zuora.ZuoraGetAccountSummary.ZuoraAccount.PaymentMethodId
import com.gu.util.zuora._
import play.api.libs.json.JsPath
import scalaz.std.list._
import scalaz.syntax.applicative._
import scalaz.{ListT, NonEmptyList}

object SourceUpdatedSteps extends Logging {

  case class SourceUpdatedUrlParams(stripeAccount: Option[StripeAccount] = None)
  object SourceUpdatedUrlParams {
    implicit val reads = (JsPath \ "stripeAccount").readNullable[String].map { accountName =>
      val maybeStripeAccount = accountName.flatMap(StripeAccount.fromString)
      SourceUpdatedUrlParams(maybeStripeAccount)
    }
  }

  def apply(zuoraRequests: Requests, stripeDeps: StripeDeps): Operation = Operation.noHealthcheck({ apiGatewayRequest: ApiGatewayRequest =>
    (for {
      sourceUpdatedCallout <- if (stripeDeps.config.signatureChecking) bodyIfSignatureVerified(stripeDeps, apiGatewayRequest) else apiGatewayRequest.bodyAsCaseClass[SourceUpdatedCallout]()
      _ <- (for {
        defaultPaymentMethod <- ListT(getPaymentMethodsToUpdate(zuoraRequests)(sourceUpdatedCallout.data.`object`.customer, sourceUpdatedCallout.data.`object`.id))
        _ <- ListT[ApiGatewayOp, Unit](createUpdatedDefaultPaymentMethod(zuoraRequests)(defaultPaymentMethod, sourceUpdatedCallout.data.`object`).map((_: Unit) => List(())))
      } yield ()).run
    } yield ApiGatewayResponse.successfulExecution).apiResponse
  })

  def createUpdatedDefaultPaymentMethod(requests: Requests)(paymentMethodFields: PaymentMethodFields, eventDataObject: EventDataObject): ApiGatewayOp[Unit] = {
    for {
      // similar to ZuoraService.createPaymentMethod only in REST api
      paymentMethod <- createPaymentMethod(requests)(eventDataObject, paymentMethodFields).withLogging("createPaymentMethod")
      _ <- SetDefaultPaymentMethod.setDefaultPaymentMethod(requests)(paymentMethodFields.AccountId, paymentMethod.id)
        .toApiGatewayOp("SetDefaultPaymentMethod failed").withLogging("setDefaultPaymentMethod")
    } yield ()
  }

  def bodyIfSignatureVerified(stripeDeps: StripeDeps, apiGatewayRequest: ApiGatewayRequest): ApiGatewayOp[SourceUpdatedCallout] = for {
    queryParams <- apiGatewayRequest.queryParamsAsCaseClass[SourceUpdatedUrlParams]()
    _ = logger.info(s"from: ${queryParams.stripeAccount}")
    maybeStripeAccount = queryParams.stripeAccount
    signatureVerified = verifyRequest(stripeDeps, apiGatewayRequest.headers.getOrElse(Map()), apiGatewayRequest.body.getOrElse(""), maybeStripeAccount)
    res <- if (signatureVerified) {
      apiGatewayRequest.bodyAsCaseClass[SourceUpdatedCallout]()
    } else
      ReturnWithResponse(unauthorized)
  } yield res

  def getPaymentMethodsToUpdate(
    requests: Requests
  )(customer: StripeCustomerId, source: StripeSourceId): ApiGatewayOp[List[PaymentMethodFields]] = {
    val zuoraQuerier = ZuoraQuery(requests)
    (for {
      // similar to AccountController.updateCard in members-data-api
      paymentMethods <- ListT.apply[ApiGatewayOp, AccountPaymentMethodIds](
        ZuoraQueryPaymentMethod.getPaymentMethodForStripeCustomer(zuoraQuerier)(customer, source)
          .withLogging("getPaymentMethodForStripeCustomer")
      )
      account <- ListT[ApiGatewayOp, AccountSummary](
        ZuoraGetAccountSummary(requests)(paymentMethods.accountId.value)
          .toApiGatewayOp("ZuoraGetAccountSummary failed").withLogging("getAccountSummary").map(_.pure[List])
      )
      defaultPaymentMethods <- ListT[ApiGatewayOp, PaymentMethodFields](
        findDefaultOrSkip(account.basicInfo.defaultPaymentMethod, paymentMethods.paymentMethods)
          .toList.pure[ApiGatewayOp].withLogging("skipIfNotDefault")
      )
    } yield defaultPaymentMethods).run
  }

  import com.gu.util.reader.Types._

  def createPaymentMethod(requests: Requests)(
    eventDataObject: EventDataObject,
    paymentMethodFields: PaymentMethodFields
  ): ApiGatewayOp[CreatePaymentMethod.CreatePaymentMethodResult] = {
    for {
      creditCardType <- Some(eventDataObject.brand).collect {
        case StripeBrand.Visa => CreditCardType.Visa
        case StripeBrand.Discover => CreditCardType.Discover
        case StripeBrand.MasterCard => CreditCardType.MasterCard
        case StripeBrand.AmericanExpress => CreditCardType.AmericanExpress
      }.toApiGatewayContinueProcessing(ApiGatewayResponse.internalServerError(s"not valid card type for zuora: ${eventDataObject.brand}"))
      result <- CreatePaymentMethod.createPaymentMethod(requests)(CreateStripePaymentMethod(
        paymentMethodFields.AccountId,
        eventDataObject.id,
        eventDataObject.customer,
        eventDataObject.country,
        eventDataObject.last4,
        eventDataObject.expiry,
        creditCardType,
        paymentMethodFields.NumConsecutiveFailures
      )).toApiGatewayOp("CreatePaymentMethod failed")
    } yield result
  }

  def findDefaultOrSkip(defaultPaymentMethod: PaymentMethodId, paymentMethods: NonEmptyList[PaymentMethodFields]): Option[PaymentMethodFields] = {
    paymentMethods.list.find(_.Id == defaultPaymentMethod)
  }

}

