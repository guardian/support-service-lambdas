package com.gu.stripeCustomerSourceUpdated

import com.gu.util._
import com.gu.util.apigateway.{ ApiGatewayRequest, ApiGatewayResponse }
import com.gu.util.reader.Types._
import com.gu.util.zuora.CreatePaymentMethod.{ CreateStripePaymentMethod, CreditCardType }
import com.gu.util.zuora.ZuoraModels.AccountSummary
import com.gu.util.zuora.ZuoraQueryPaymentMethod.PaymentMethodId
import com.gu.util.zuora._
import okhttp3.{ Request, Response }
import play.api.libs.json.Json

import scalaz._
import scalaz.syntax.applicative._
import scalaz.syntax.std.option._

object SourceUpdatedSteps extends Logging {

  def apply(deps: Deps)(apiGatewayRequest: ApiGatewayRequest): FailableOp[Unit] = {
    (for {
      paymentFailureCallout <- Json.fromJson[SourceUpdatedCallout](Json.parse(apiGatewayRequest.body)).toFailableOp.pure[WithDeps].toEitherT
      _ = logger.info(s"received $paymentFailureCallout")
      // TODO... similar to AccountController.updateCard in members-data-api
      // query zuora for account and payment method given the token id
      paymentMethods <- ZuoraQueryPaymentMethod.getPaymentMethodForStripeCustomer(paymentFailureCallout.data.`object`.customer)
      account <- Zuora.getAccountSummary(paymentMethods.accountId.value)
      // make sure the tokens relate to the default payment method
      _ <- skipIfNotDefault(account.basicInfo.defaultPaymentMethod, paymentMethods.paymentMethodIds).pure[WithDeps].toEitherT
      // check that the account payment gateway matches (which?) stripe payment gateway (do we even need to do this? if it's the default, it must be right)
      //...
      // (clear default payment method and autopay off not needed because we are not changing the payment gateway)
      // would be nice to have to know which stripe called us, and check the gateway matches
      //...
      // create payment method with accountid, cardid, customerid, last4, cardcountry, expiry, cardtype
      //TODO similar to ZuoraService.createPaymentMethod only in REST api
      paymentMethod <- createPaymentMethod(paymentFailureCallout, account)
      // set payment method as the default - update account defaultpaymentmethodid
      _ <- SetDefaultPaymentMethod.setDefaultPaymentMethod(account.basicInfo.id, paymentMethod.id)
    } yield ()).run.run(ZuoraDeps(deps.response, deps.config))
  }

  import com.gu.util.reader.Types._

  type WithDeps[A] = Reader[ZuoraDeps, A]

  def createPaymentMethod(callout: SourceUpdatedCallout, account: AccountSummary): WithDepsFailableOp[ZuoraDeps, CreatePaymentMethod.CreatePaymentMethodResult] = {
    for {
      creditCardType <- Some(callout.data.`object`.brand).collect {
        case StripeBrand.Visa => CreditCardType.Visa
        case StripeBrand.Discover => CreditCardType.Discover
        case StripeBrand.MasterCard => CreditCardType.MasterCard
        case StripeBrand.AmericanExpress => CreditCardType.AmericanExpress
      }.toRightDisjunction(ApiGatewayResponse.internalServerError(s"not valid card type for zuora: ${callout.data.`object`.brand}")).pure[WithDeps].toEitherT
      result <- CreatePaymentMethod.createPaymentMethod(CreateStripePaymentMethod(
        account.basicInfo.id,
        callout.data.`object`.id,
        callout.data.`object`.customer,
        callout.data.`object`.country,
        callout.data.`object`.last4,
        callout.data.`object`.expiry,
        creditCardType
      ))
    } yield result
  }

  def skipIfNotDefault(defaultPaymentMethod: PaymentMethodId, paymentMethodIds: NonEmptyList[PaymentMethodId]): FailableOp[Unit] = {
    if (paymentMethodIds.list.contains(defaultPaymentMethod)) {
      // this card update event relates to a the default payment method - continue
      \/-(())
    } else {
      // the card is updating some NON default payment method - ignore (or should we update anyway but keep it in the background?)
      -\/(ApiGatewayResponse.successfulExecution)
    }
  }

  object Deps {
    def default(response: Request => Response, config: Config): Deps = {
      Deps(response, config.zuoraRestConfig)
    }
  }

  case class Deps(response: Request => Response, config: ZuoraRestConfig)

}

