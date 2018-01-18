package com.gu.stripeCustomerSourceUpdated

import com.gu.stripeCustomerSourceUpdated.StripeRequestSignatureChecker.verifyRequest
import com.gu.util._
import com.gu.util.apigateway.ApiGatewayResponse.unauthorized
import com.gu.util.apigateway.ResponseModels.ApiResponse
import com.gu.util.apigateway.{ ApiGatewayRequest, ApiGatewayResponse, StripeAccount }
import com.gu.util.reader.Types._
import com.gu.util.zuora.CreatePaymentMethod.{ CreateStripePaymentMethod, CreditCardType }
import com.gu.util.zuora.ZuoraGetAccountSummary.AccountSummary
import com.gu.util.zuora.ZuoraQueryPaymentMethod.{ AccountPaymentMethodIds, PaymentMethodFields, PaymentMethodId }
import com.gu.util.zuora._
import okhttp3.{ Request, Response }
import play.api.libs.json.Json

import scalaz._
import scalaz.syntax.applicative._
import scalaz.syntax.std.option._
import scalaz.std.list._
import scalaz.EitherT._

object SourceUpdatedSteps extends Logging {

  type WithZuoraDepsFailableOp[A] = WithDepsFailableOp[ZuoraDeps, A]
  implicit val mWithZuoraDepsFailableOp: Monad[WithZuoraDepsFailableOp] = eitherTMonad[({ type XReader[AA] = Reader[ZuoraDeps, AA] })#XReader, ApiResponse]

  def apply(deps: Deps)(apiGatewayRequest: ApiGatewayRequest): FailableOp[Unit] = {
    (for {
      body <- bodyIfSignatureVerified(deps.stripeDeps, apiGatewayRequest).pure[WithDeps].toEitherT
      sourceUpdatedCallout <- Json.fromJson[SourceUpdatedCallout](Json.parse(body)).toFailableOp.withLogging("fromJson SourceUpdatedCallout").pure[WithDeps].toEitherT
      _ = logger.info(s"from: ${apiGatewayRequest.queryStringParameters.map(_.stripeAccount)}")
      _ <- (for {
        defaultPaymentMethod <- ListT(getPaymentMethodsToUpdate(sourceUpdatedCallout.data.`object`.customer, sourceUpdatedCallout.data.`object`.id))
        _ <- ListT[WithZuoraDepsFailableOp, Unit](createUpdatedDefaultPaymentMethod(defaultPaymentMethod, sourceUpdatedCallout.data.`object`).map(_.pure[List]))
      } yield ()).run
    } yield ()).run.run(deps.zuoraDeps)
  }

  def createUpdatedDefaultPaymentMethod(paymentMethodFields: PaymentMethodFields, eventDataObject: EventDataObject): WithZuoraDepsFailableOp[Unit] = {
    for {
      // similar to ZuoraService.createPaymentMethod only in REST api
      paymentMethod <- createPaymentMethod(eventDataObject, paymentMethodFields).withLogging("createPaymentMethod")
      _ <- SetDefaultPaymentMethod.setDefaultPaymentMethod(paymentMethodFields.AccountId, paymentMethod.id).withLogging("setDefaultPaymentMethod")
    } yield ()
  }

  def bodyIfSignatureVerified(stripeDeps: StripeDeps, apiGatewayRequest: ApiGatewayRequest): FailableOp[String] = {
    val maybeStripeAccount: Option[StripeAccount] = apiGatewayRequest.queryStringParameters.flatMap { params => params.stripeAccount }
    val signatureVerified: Boolean = verifyRequest(stripeDeps, apiGatewayRequest.headers.getOrElse(Map()), apiGatewayRequest.body, maybeStripeAccount)

    if (signatureVerified)
      \/-(apiGatewayRequest.body)
    else
      -\/(unauthorized)
  }

  def getPaymentMethodsToUpdate(customer: StripeCustomerId, source: StripeSourceId): WithZuoraDepsFailableOp[List[PaymentMethodFields]] = {
    (for {
      // similar to AccountController.updateCard in members-data-api
      paymentMethods <- ListT.apply[WithZuoraDepsFailableOp, AccountPaymentMethodIds](ZuoraQueryPaymentMethod.getPaymentMethodForStripeCustomer(customer, source).withLogging("getPaymentMethodForStripeCustomer"))
      account <- ListT[WithZuoraDepsFailableOp, AccountSummary](ZuoraGetAccountSummary(paymentMethods.accountId.value).withLogging("getAccountSummary").map(_.pure[List]))
      defaultPaymentMethods <- ListT[WithZuoraDepsFailableOp, PaymentMethodFields](findDefaultOrSkip(account.basicInfo.defaultPaymentMethod, paymentMethods.paymentMethods).toList.pure[FailableOp].withLogging("skipIfNotDefault").pure[WithDeps].toEitherT)
    } yield defaultPaymentMethods).run
  }

  import com.gu.util.reader.Types._

  type WithDeps[A] = Reader[ZuoraDeps, A]

  def createPaymentMethod(eventDataObject: EventDataObject, paymentMethodFields: PaymentMethodFields): WithZuoraDepsFailableOp[CreatePaymentMethod.CreatePaymentMethodResult] = {
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

  def findDefaultOrSkip(defaultPaymentMethod: PaymentMethodId, paymentMethods: NonEmptyList[PaymentMethodFields]): Option[PaymentMethodFields] = {
    paymentMethods.list.find(_.Id == defaultPaymentMethod)
  }

  object Deps {
    def default(response: Request => Response, config: Config): Deps = {
      Deps(ZuoraDeps(response, config.zuoraRestConfig), StripeDeps(config.stripeConfig, new StripeSignatureChecker))
    }
  }

  case class Deps(zuoraDeps: ZuoraDeps, stripeDeps: StripeDeps)

}

