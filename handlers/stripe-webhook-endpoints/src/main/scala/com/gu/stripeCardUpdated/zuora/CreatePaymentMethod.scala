package com.gu.stripeCardUpdated.zuora

import com.gu.stripeCardUpdated.{StripeCountry, StripeCustomerId, StripeExpiry, StripeLast4, StripeCardId}
import com.gu.util.resthttp.RestRequestMaker.Requests
import com.gu.util.resthttp.Types.ClientFailableOp
import com.gu.util.zuora.ZuoraGetAccountSummary.ZuoraAccount.{AccountId, NumConsecutiveFailures, PaymentMethodId}
import play.api.libs.json.{JsPath, Json, Reads, Writes}

object CreatePaymentMethod {

  case class CreateStripePaymentMethod(
      accountId: AccountId,
      cardId: StripeCardId,
      customerId: StripeCustomerId,
      cardCountry: StripeCountry,
      last4: StripeLast4,
      expiration: StripeExpiry,
      creditCardType: CreditCardType,
      numConsecutiveFailures: NumConsecutiveFailures,
  )

  sealed abstract class CreditCardType(val value: String)
  object CreditCardType {

    case object AmericanExpress extends CreditCardType("AmericanExpress")
    case object Discover extends CreditCardType("Discover")
    case object MasterCard extends CreditCardType("MasterCard")
    case object Visa extends CreditCardType("Visa")

  }

  // FIXME create WireRequest/Response and converter layer to replace the custom writes and reads
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
      "NumConsecutiveFailures" -> command.numConsecutiveFailures,
    )
  }

  implicit val reads: Reads[CreatePaymentMethodResult] =
    (JsPath \ "Id").read[PaymentMethodId].map(CreatePaymentMethodResult.apply _)

  case class CreatePaymentMethodResult(id: PaymentMethodId)

  def createPaymentMethod(requests: Requests)(
      request: CreateStripePaymentMethod,
  ): ClientFailableOp[CreatePaymentMethodResult] =
    requests.post[CreateStripePaymentMethod, CreatePaymentMethodResult](request, s"object/payment-method")

}
