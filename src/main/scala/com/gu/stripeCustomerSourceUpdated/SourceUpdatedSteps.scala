package com.gu.stripeCustomerSourceUpdated

import com.gu.util._
import com.gu.util.apigateway.{ApiGatewayRequest, ApiGatewayResponse}
import com.gu.util.reader.Types._
import com.gu.util.zuora.{Zuora, ZuoraQueryPaymentMethod}
import okhttp3.{Request, Response}
import play.api.libs.json.Json
import com.gu.util.reader.Types._
import com.gu.util.zuora.ZuoraModels.PaymentMethod
import com.gu.util.zuora.ZuoraQueryPaymentMethod.PaymentMethodId

import scalaz.{-\/, Kleisli, NonEmptyList, Reader, \/-}

object SourceUpdatedSteps extends Logging {

  def apply(deps: Deps)(apiGatewayRequest: ApiGatewayRequest): FailableOp[Unit] = {
    for {
      paymentFailureCallout <- Json.fromJson[SourceUpdatedCallout](Json.parse(apiGatewayRequest.body)).toFailableOp
      _ = logger.info(s"received $paymentFailureCallout")
      // TODO... similar to AccountController.updateCard in members-data-api
      // query zuora for account and payment method given the token id
      paymentMethods <- ZuoraQueryPaymentMethod.getPaymentMethodForStripeCustomer(paymentFailureCallout.data.`object`.customer)
      account <- Zuora.getAccountSummary(paymentMethods.accountId.value)
      // make sure the tokens relate to the default payment method
      _ <- Reader(_ => skipIfNotDefault(account.basicInfo.defaultPaymentMethod, paymentMethods.paymentMethodIds)).toEitherT
      // check that the account payment gateway matches (which?) stripe payment gateway (do we even need to do this? if it's the default, it must be right)
      //...
      // (clear default payment method and autopay off not needed because we are not changing the payment gateway)
      // would be nice to have to know which stripe called us, and check the gateway matches
      //...
      // create payment method with accountid, cardid, customerid, last4, cardcountry, expiry, cardtype
      //TODO similar to ZuoraService.createPaymentMethod only in REST api
      // set payment method as the default - update account defaultpaymentmethodid
    } yield ()
  }

  def skipIfNotDefault(defaultPaymentMethod: PaymentMethod, paymentMethodIds: NonEmptyList[PaymentMethodId]): FailableOp[Unit] = {
    if (paymentMethodIds.list.contains(defaultPaymentMethod.id)) {
      // this card update event relates to a the default payment method - continue
      \/-(())
    } else {
      // the card is updating some NON default payment method - ignore (or should we update anyway but keep it in the background?)
      -\/(ApiGatewayResponse.successfulExecution)
    }
  }

  object Deps {
    def default(response: Request => Response, config: Config): Deps = {
      Deps()
    }
  }

  case class Deps()

}

