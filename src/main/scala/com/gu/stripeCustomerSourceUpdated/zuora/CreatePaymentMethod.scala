package com.gu.stripeCustomerSourceUpdated.zuora

import com.gu.stripeCustomerSourceUpdated._
import com.gu.util.apigateway.ApiGatewayResponse
import com.gu.util.reader.Types.WithDepsFailableOp
import com.gu.util.zuora.ZuoraAccount.{ AccountId, NumConsecutiveFailures, PaymentMethodId }
import com.gu.util.zuora.ZuoraDeps
import com.gu.util.zuora.ZuoraRestRequestMaker.post
import play.api.libs.json.{ JsPath, Json, Reads, Writes }

object CreatePaymentMethod {

  case class CreateStripePaymentMethod(
    accountId: AccountId,
    cardId: StripeSourceId,
    customerId: StripeCustomerId,
    cardCountry: StripeCountry,
    last4: StripeLast4,
    expiration: StripeExpiry,
    creditCardType: CreditCardType,
    numConsecutiveFailures: NumConsecutiveFailures)

  sealed abstract class CreditCardType(val value: String)
  object CreditCardType {

    case object AmericanExpress extends CreditCardType("AmericanExpress")
    case object Discover extends CreditCardType("Discover")
    case object MasterCard extends CreditCardType("MasterCard")
    case object Visa extends CreditCardType("Visa")

  }

  implicit val writes = new Writes[CreateStripePaymentMethod] {
    def writes(command: CreateStripePaymentMethod) = Json.obj(
      "AccountId" -> command.accountId.value,
      "TokenId" -> command.cardId.value,
      "SecondTokenId" -> command.customerId.value,
      "CreditCardCountry" -> command.cardCountry.value,
      "CreditCardNumber" -> command.last4.value,
      "CreditCardExpirationMonth" -> command.expiration.exp_month,
      "CreditCardExpirationYear" -> command.expiration.exp_year,
      "CreditCardType" -> command.creditCardType.value,
      "Type" -> "CreditCardReferenceTransaction",
      "NumConsecutiveFailures" -> command.numConsecutiveFailures)
  }

  implicit val reads: Reads[CreatePaymentMethodResult] =
    (JsPath \ "Id").read[PaymentMethodId].map(CreatePaymentMethodResult.apply _)

  case class CreatePaymentMethodResult(id: PaymentMethodId)

  def createPaymentMethod(request: CreateStripePaymentMethod): WithDepsFailableOp[ZuoraDeps, CreatePaymentMethodResult] =
    post[CreateStripePaymentMethod, CreatePaymentMethodResult](request, s"object/payment-method").leftMap(ApiGatewayResponse.fromClientFail)

}
