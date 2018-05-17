package com.gu.stripeCustomerSourceUpdated

import com.gu.stripeCustomerSourceUpdated.StripeRequestSignatureChecker.verifyRequest
import com.gu.stripeCustomerSourceUpdated.zuora.CreatePaymentMethod.{CreateStripePaymentMethod, CreditCardType}
import com.gu.stripeCustomerSourceUpdated.zuora.ZuoraQueryPaymentMethod.{AccountPaymentMethodIds, PaymentMethodFields}
import com.gu.stripeCustomerSourceUpdated.zuora.{CreatePaymentMethod, SetDefaultPaymentMethod, ZuoraQueryPaymentMethod}
import com.gu.util.apigateway.ApiGatewayHandler.Operation
import com.gu.util.apigateway.ApiGatewayResponse.unauthorized
import com.gu.util.apigateway.{ApiGatewayRequest, ApiGatewayResponse, StripeAccount}
import com.gu.util.reader.Types._
import com.gu.util.zuora.RestRequestMaker.Requests
import com.gu.util.zuora.ZuoraAccount.PaymentMethodId
import com.gu.util.zuora.ZuoraGetAccountSummary.AccountSummary
import com.gu.util.zuora._
import com.gu.util.{Logging, _}
import play.api.libs.json.{Json, Reads}
import scalaz._
import scalaz.std.list._
import scalaz.syntax.applicative._
import scalaz.syntax.std.option._

object SourceUpdatedSteps extends Logging {

  case class StepsConfig(zuoraRestConfig: ZuoraRestConfig)
  implicit val stepsConfigReads: Reads[StepsConfig] = Json.reads[StepsConfig]

  def apply(zuoraRequests: Requests, stripeDeps: StripeDeps): Operation = Operation.noHealthcheck({ apiGatewayRequest: ApiGatewayRequest =>
    for {
      sourceUpdatedCallout <- if (stripeDeps.config.signatureChecking) bodyIfSignatureVerified(stripeDeps, apiGatewayRequest) else apiGatewayRequest.parseBody[SourceUpdatedCallout]()
      _ = logger.info(s"from: ${apiGatewayRequest.queryStringParameters.map(_.stripeAccount)}")
      _ <- (for {
        defaultPaymentMethod <- ListT(getPaymentMethodsToUpdate(zuoraRequests)(sourceUpdatedCallout.data.`object`.customer, sourceUpdatedCallout.data.`object`.id))
        _ <- ListT[FailableOp, Unit](createUpdatedDefaultPaymentMethod(zuoraRequests)(defaultPaymentMethod, sourceUpdatedCallout.data.`object`).map(_.pure[List]))
      } yield ()).run
    } yield ()
  })

  def createUpdatedDefaultPaymentMethod(requests: Requests)(paymentMethodFields: PaymentMethodFields, eventDataObject: EventDataObject): FailableOp[Unit] = {
    for {
      // similar to ZuoraService.createPaymentMethod only in REST api
      paymentMethod <- createPaymentMethod(requests)(eventDataObject, paymentMethodFields).withLogging("createPaymentMethod")
      _ <- SetDefaultPaymentMethod.setDefaultPaymentMethod(requests)(paymentMethodFields.AccountId, paymentMethod.id).withLogging("setDefaultPaymentMethod")
    } yield ()
  }

  def bodyIfSignatureVerified(stripeDeps: StripeDeps, apiGatewayRequest: ApiGatewayRequest): FailableOp[SourceUpdatedCallout] = {
    val maybeStripeAccount: Option[StripeAccount] = apiGatewayRequest.queryStringParameters.flatMap { params => params.stripeAccount }
    val signatureVerified: Boolean = verifyRequest(stripeDeps, apiGatewayRequest.headers.getOrElse(Map()), apiGatewayRequest.body.getOrElse(""), maybeStripeAccount)

    if (signatureVerified)
      apiGatewayRequest.parseBody[SourceUpdatedCallout]()
    else
      -\/(unauthorized)
  }

  def getPaymentMethodsToUpdate(
    requests: Requests,
  )(customer: StripeCustomerId, source: StripeSourceId): FailableOp[List[PaymentMethodFields]] = {
    val zuoraQuerier = ZuoraQuery(requests)
    (for {
      // similar to AccountController.updateCard in members-data-api
      paymentMethods <- ListT.apply[FailableOp, AccountPaymentMethodIds](
        ZuoraQueryPaymentMethod.getPaymentMethodForStripeCustomer(zuoraQuerier)(customer, source)
          .withLogging("getPaymentMethodForStripeCustomer"))
      account <- ListT[FailableOp, AccountSummary](
        ZuoraGetAccountSummary(requests)(paymentMethods.accountId.value)
          .leftMap(ZuoraToApiGateway.fromClientFail).withLogging("getAccountSummary").map(_.pure[List]))
      defaultPaymentMethods <- ListT[FailableOp, PaymentMethodFields](
        findDefaultOrSkip(account.basicInfo.defaultPaymentMethod, paymentMethods.paymentMethods)
          .toList.pure[FailableOp].withLogging("skipIfNotDefault"))
    } yield defaultPaymentMethods).run
  }

  import com.gu.util.reader.Types._

  def createPaymentMethod(requests: Requests)(eventDataObject: EventDataObject, paymentMethodFields: PaymentMethodFields): FailableOp[CreatePaymentMethod.CreatePaymentMethodResult] = {
    for {
      creditCardType <- Some(eventDataObject.brand).collect {
        case StripeBrand.Visa => CreditCardType.Visa
        case StripeBrand.Discover => CreditCardType.Discover
        case StripeBrand.MasterCard => CreditCardType.MasterCard
        case StripeBrand.AmericanExpress => CreditCardType.AmericanExpress
      }.toRightDisjunction(ApiGatewayResponse.internalServerError(s"not valid card type for zuora: ${eventDataObject.brand}"))
      result <- CreatePaymentMethod.createPaymentMethod(requests)(CreateStripePaymentMethod(
        paymentMethodFields.AccountId,
        eventDataObject.id,
        eventDataObject.customer,
        eventDataObject.country,
        eventDataObject.last4,
        eventDataObject.expiry,
        creditCardType,
        paymentMethodFields.NumConsecutiveFailures
      ))
    } yield result
  }

  def findDefaultOrSkip(defaultPaymentMethod: PaymentMethodId, paymentMethods: NonEmptyList[PaymentMethodFields]): Option[PaymentMethodFields] = {
    paymentMethods.list.find(_.Id == defaultPaymentMethod)
  }

}

