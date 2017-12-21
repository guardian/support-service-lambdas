package com.gu.stripeCustomerSourceUpdated

import com.gu.util._
import com.gu.util.apigateway.ApiGatewayRequest
import com.gu.util.reader.Types._
import okhttp3.{ Request, Response }
import play.api.libs.json.Json

object SourceUpdatedSteps extends Logging {

  def apply(deps: Deps)(apiGatewayRequest: ApiGatewayRequest): FailableOp[Unit] = {
    for {
      paymentFailureCallout <- Json.fromJson[SourceUpdatedCallout](Json.parse(apiGatewayRequest.body)).toFailableOp
      _ = logger.info(s"received $paymentFailureCallout")
      // TODO... similar to AccountController.updateCard in members-data-api
      // query zuora for account and payment method given the token id
      // make sure the tokens relate to the default payment method
      // check that the account payment gateway matches the stripe payment gateway
      // (clear default payment method and autopay off - may not be needed)
      // create payment method with accountid, cardid, customerid, last4, cardcountry, expiry, cardtype
      // set payment method as the default - update account defaultpaymentmethodid
    } yield ()
  }

  object Deps {
    def default(response: Request => Response, config: Config): Deps = {
      Deps()
    }
  }

  case class Deps()

}
