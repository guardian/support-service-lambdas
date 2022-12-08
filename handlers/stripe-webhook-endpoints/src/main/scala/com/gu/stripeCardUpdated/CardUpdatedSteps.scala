package com.gu.stripeCardUpdated

import StripeRequestSignatureChecker.verifyRequest
import TypeConvert._
import com.gu.stripeCardUpdated.zuora.CreatePaymentMethod.{CreatePaymentMethodResult, CreateStripePaymentMethod, CreditCardType}
import com.gu.stripeCardUpdated.zuora.ZuoraQueryPaymentMethod.PaymentMethodFields
import com.gu.util.Logging
import com.gu.util.apigateway.ApiGatewayHandler.Operation
import com.gu.util.apigateway.ApiGatewayResponse.messageResponse
import com.gu.util.apigateway.{ApiGatewayRequest, ApiGatewayResponse}
import com.gu.util.reader.Types.ApiGatewayOp._
import com.gu.util.reader.Types._
import com.gu.util.resthttp.RestRequestMaker.Requests
import com.gu.util.zuora.ZuoraGetAccountSummary.ZuoraAccount.PaymentMethodId
import com.gu.util.zuora._
import play.api.libs.json.JsPath
import cats.syntax.all._
import cats.data.NonEmptyList
import com.gu.stripeCardUpdated.zuora.CreatePaymentMethod.CreatePaymentMethodResult
import com.gu.stripeCardUpdated.zuora.CreatePaymentMethod.CreditCardType.{AmericanExpress, Discover, MasterCard, Visa}
import com.gu.stripeCardUpdated.zuora.{CreatePaymentMethod, SetDefaultPaymentMethod, ZuoraQueryPaymentMethod}
import com.gu.stripeCardUpdated.zuora.ZuoraQueryPaymentMethod.PaymentMethodFields

object CardUpdatedSteps extends Logging {

  case class CardUpdatedUrlParams(stripeAccount: Option[StripeAccount] = None)
  object CardUpdatedUrlParams {
    implicit val reads = (JsPath \ "stripeAccount").readNullable[String].map { accountName =>
      val maybeStripeAccount = accountName.flatMap(StripeAccount.fromString)
      CardUpdatedUrlParams(maybeStripeAccount)
    }
  }

  def apply(zuoraRequests: Requests, stripeDeps: StripeDeps): Operation = Operation.noHealthcheck { apiGatewayRequest =>
    val apiGatewayBody = if (stripeDeps.config.signatureChecking)
      bodyIfSignatureVerified(stripeDeps, apiGatewayRequest)
    else
      apiGatewayRequest.bodyAsCaseClass[CardUpdatedMessageBody]()

    val updatePaymentMethodsResult = for {
      cardUpdatedMessageBody <- apiGatewayBody
      paymentMethods <- getPaymentMethodsToUpdate(zuoraRequests)(cardUpdatedMessageBody.data.`object`.customer, cardUpdatedMessageBody.data.`object`.id)
    } yield paymentMethods.traverse(defaultPaymentMethod =>
      createUpdatedDefaultPaymentMethod(zuoraRequests)(defaultPaymentMethod, cardUpdatedMessageBody.data.`object`))

    updatePaymentMethodsResult
      .map(_ => ApiGatewayResponse.successfulExecution)
      .apiResponse
  }

  def createUpdatedDefaultPaymentMethod(requests: Requests)(paymentMethodFields: PaymentMethodFields, eventDataObject: EventDataObject): ApiGatewayOp[Unit] = {
    for {
      // similar to ZuoraService.createPaymentMethod only in REST api
      paymentMethod <- createPaymentMethod(requests)(eventDataObject, paymentMethodFields).withLogging("createPaymentMethod")
      _ <- SetDefaultPaymentMethod.setDefaultPaymentMethod(requests)(paymentMethodFields.AccountId, paymentMethod.id)
        .toApiGatewayOp("SetDefaultPaymentMethod failed").withLogging("setDefaultPaymentMethod")
    } yield ()
  }

  def bodyIfSignatureVerified(stripeDeps: StripeDeps, apiGatewayRequest: ApiGatewayRequest): ApiGatewayOp[CardUpdatedMessageBody] = for {
    queryParams <- apiGatewayRequest.queryParamsAsCaseClass[CardUpdatedUrlParams]()
    _ = logger.info(s"from: ${queryParams.stripeAccount}")
    maybeStripeAccount = queryParams.stripeAccount
    signatureVerified = verifyRequest(stripeDeps, apiGatewayRequest.headers.getOrElse(Map()), apiGatewayRequest.body.getOrElse(""), maybeStripeAccount)
    res <- if (signatureVerified) {
      apiGatewayRequest.bodyAsCaseClass[CardUpdatedMessageBody]()
    } else
      ReturnWithResponse(messageResponse(
        "401",
        "Couldn't verify the signature of the webhook payload, do you have the correct signing secret key in config? " +
          "See https://stripe.com/docs/webhooks/signatures for more information"
      ))
  } yield res

  def getPaymentMethodsToUpdate(
    requests: Requests
  )(customer: StripeCustomerId, source: StripeSourceId): ApiGatewayOp[List[PaymentMethodFields]] = {
    val zuoraQuerier = ZuoraQuery(requests)
    for {
      zuoraPaymentMethodIds <- ZuoraQueryPaymentMethod.getPaymentMethodForStripeCustomer(zuoraQuerier)(customer, source)
      paymentMethodFields <- zuoraPaymentMethodIds.flatTraverse { paymentMethodIds =>
        ZuoraGetAccountSummary(requests)(paymentMethodIds.accountId.value).toApiGatewayOp("ZuoraGetAccountSummary failed")
          .flatMap { account =>
            findDefaultOrSkip(account.basicInfo.defaultPaymentMethod, paymentMethodIds.paymentMethods).toList.pure[ApiGatewayOp].withLogging("findDefaultOrSkip")
          }
      }
    } yield paymentMethodFields
  }

  import com.gu.util.reader.Types._

  def createPaymentMethod(requests: Requests)(
    eventDataObject: EventDataObject,
    paymentMethodFields: PaymentMethodFields
  ): ApiGatewayOp[CreatePaymentMethodResult] = {
    for {
      creditCardType <- Some(eventDataObject.brand).collect {
        case StripeBrand.Visa => Visa
        case StripeBrand.Discover => Discover
        case StripeBrand.MasterCard => MasterCard
        case StripeBrand.AmericanExpress => AmericanExpress
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
    paymentMethods.find(_.Id == defaultPaymentMethod)
  }

}

