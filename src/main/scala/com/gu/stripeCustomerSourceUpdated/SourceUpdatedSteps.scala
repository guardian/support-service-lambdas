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
      defaultPaymentMethod <- getPaymentMethodToUpdate(sourceUpdatedCallout.data.`object`.customer, sourceUpdatedCallout.data.`object`.id)
      _ <- createUpdatedDefaultPaymentMethod(defaultPaymentMethod, sourceUpdatedCallout.data.`object`)
    } yield ()).run.run(deps.zuoraDeps)
  }

  def createUpdatedDefaultPaymentMethod(paymentMethodFields: PaymentMethodFields, eventDataObject: EventDataObject): WithDepsFailableOp[ZuoraDeps, Unit] = {
    for {
      // similar to ZuoraService.createPaymentMethod only in REST api
      paymentMethod <- createPaymentMethod(eventDataObject, paymentMethodFields).withLogging("createPaymentMethod")
      _ <- SetDefaultPaymentMethod.setDefaultPaymentMethod(paymentMethodFields.AccountId, paymentMethod.id).withLogging("setDefaultPaymentMethod")
    } yield ()
  }

  def getPaymentMethodToUpdate(customer: StripeCustomerId, source: StripeSourceId): WithDepsFailableOp[ZuoraDeps, PaymentMethodFields] = {
    for {
      // similar to AccountController.updateCard in members-data-api
      paymentMethods <- ZuoraQueryPaymentMethod.getPaymentMethodForStripeCustomer(customer, source).withLogging("getPaymentMethodForStripeCustomer")
      account <- ZuoraGetAccountSummary(paymentMethods.accountId.value).withLogging("getAccountSummary")
      defaultPaymentMethod <- findDefaultOrSkip(account.basicInfo.defaultPaymentMethod, paymentMethods.paymentMethods).withLogging("skipIfNotDefault").pure[WithDeps].toEitherT
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

  def findDefaultOrSkip(defaultPaymentMethod: PaymentMethodId, paymentMethods: NonEmptyList[PaymentMethodFields]): FailableOp[PaymentMethodFields] = {
    paymentMethods.list.find(_.Id == defaultPaymentMethod).toRightDisjunction(ApiGatewayResponse.successfulExecution)
  }

  object Deps {
    def default(response: Request => Response, config: Config): Deps = {
      Deps(ZuoraDeps(response, config.zuoraRestConfig))
    }
  }

  case class Deps(zuoraDeps: ZuoraDeps)

}

