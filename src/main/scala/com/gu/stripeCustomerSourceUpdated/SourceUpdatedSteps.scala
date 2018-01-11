package com.gu.stripeCustomerSourceUpdated

import com.gu.util._
import com.gu.util.apigateway.{ ApiGatewayRequest, ApiGatewayResponse }
import com.gu.util.reader.Types._
import com.gu.util.zuora.CreatePaymentMethod.{ CreateStripePaymentMethod, CreditCardType }
import com.gu.util.zuora.ZuoraQueryPaymentMethod.{ PaymentMethodFields, PaymentMethodId }
import com.gu.util.zuora._
import okhttp3.{ Request, Response }
import play.api.libs.json.Json

import scalaz._
import scalaz.syntax.applicative._
import scalaz.syntax.std.option._

object SourceUpdatedSteps extends Logging {

  def apply(deps: Deps)(apiGatewayRequest: ApiGatewayRequest): FailableOp[Unit] = {
    (for {
      sourceUpdatedCallout <- Json.fromJson[SourceUpdatedCallout](Json.parse(apiGatewayRequest.body)).toFailableOp.withLogging("fromJson SourceUpdatedCallout").pure[WithDeps].toEitherT
      _ = logger.info(s"from: ${apiGatewayRequest.queryStringParameters.map(_.stripeAccount)}")
      defaultPaymentMethod <- getAccountToUpdate(sourceUpdatedCallout.data.`object`.customer, sourceUpdatedCallout.data.`object`.id)
      _ <- updatePaymentMethod(defaultPaymentMethod, sourceUpdatedCallout.data.`object`)
    } yield ()).run.run(deps.zuoraDeps)
  }

  def updatePaymentMethod(paymentMethodFields: PaymentMethodFields, eventDataObject: EventDataObject): WithDepsFailableOp[ZuoraDeps, Unit] = {
    for {
      // (clear default payment method and autopay off not needed because we are not changing the payment gateway)
      // would be nice to have to know which stripe called us, and check the gateway matches
      //...
      // create payment method with accountid, cardid, customerid, last4, cardcountry, expiry, cardtype
      // similar to ZuoraService.createPaymentMethod only in REST api
      paymentMethod <- createPaymentMethod(eventDataObject, paymentMethodFields).withLogging("createPaymentMethod")
      // set payment method as the default - update account defaultpaymentmethodid
      _ <- SetDefaultPaymentMethod.setDefaultPaymentMethod(paymentMethodFields.AccountId, paymentMethod.id).withLogging("setDefaultPaymentMethod")
    } yield ()
  }

  def getAccountToUpdate(customer: StripeCustomerId, source: StripeSourceId): WithDepsFailableOp[ZuoraDeps, PaymentMethodFields] = {
    for { // similar to AccountController.updateCard in members-data-api
      // query zuora for account and payment method given the token id
      paymentMethods <- ZuoraQueryPaymentMethod.getPaymentMethodForStripeCustomer(customer, source).withLogging("getPaymentMethodForStripeCustomer")
      account <- ZuoraGetAccountSummary(paymentMethods.accountId.value).withLogging("getAccountSummary")
      // make sure the tokens relate to the default payment method
      defaultPaymentMethod <- skipIfNotDefault(account.basicInfo.defaultPaymentMethod, paymentMethods.paymentMethods).withLogging("skipIfNotDefault").pure[WithDeps].toEitherT
      // check that the account payment gateway matches (which?) stripe payment gateway (do we even need to do this? if it's the default, it must be right)
      //...
    } yield defaultPaymentMethod
  }

  import com.gu.util.reader.Types._

  type WithDeps[A] = Reader[ZuoraDeps, A]

  def createPaymentMethod(eventDataObject: EventDataObject, paymentMethodFields: PaymentMethodFields): WithDepsFailableOp[ZuoraDeps, CreatePaymentMethod.CreatePaymentMethodResult] = {
    for {
      creditCardType <- Some(eventDataObject.brand).collect {
        case StripeBrand.Visa => CreditCardType.Visa
        case StripeBrand.Discover => CreditCardType.Discover
        case StripeBrand.MasterCard => CreditCardType.MasterCard
        case StripeBrand.AmericanExpress => CreditCardType.AmericanExpress
      }.toRightDisjunction(ApiGatewayResponse.internalServerError(s"not valid card type for zuora: ${eventDataObject.brand}")).pure[WithDeps].toEitherT
      result <- CreatePaymentMethod.createPaymentMethod(CreateStripePaymentMethod(
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

  def skipIfNotDefault(defaultPaymentMethod: PaymentMethodId, paymentMethods: NonEmptyList[PaymentMethodFields]): FailableOp[PaymentMethodFields] = {
    paymentMethods.list.find(_.Id == defaultPaymentMethod).toRightDisjunction(ApiGatewayResponse.successfulExecution)
  }

  object Deps {
    def default(response: Request => Response, config: Config): Deps = {
      Deps(ZuoraDeps(response, config.zuoraRestConfig))
    }
  }

  case class Deps(zuoraDeps: ZuoraDeps)

}

