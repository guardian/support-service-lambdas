package com.gu.util.zuora

import com.gu.stripeCustomerSourceUpdated._
import com.gu.util.reader.Types.WithDepsFailableOp
import com.gu.util.zuora.ZuoraQueryPaymentMethod.{ AccountId, PaymentMethodId }
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
    creditCardType: CreditCardType
  )

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
      "CreditCardExpirationYear" -> command.expiration.exp_month,
      "CreditCardExpirationYear" -> command.expiration.exp_year,
      "CreditCardType" -> command.creditCardType.value,
      "Type" -> "CreditCardReferenceTransaction"
    )
  }

  implicit val reads: Reads[CreatePaymentMethodResult] =
    (JsPath \ "Id").read[PaymentMethodId].map(CreatePaymentMethodResult.apply _)

  case class CreatePaymentMethodResult(id: PaymentMethodId)

  def createPaymentMethod(request: CreateStripePaymentMethod): WithDepsFailableOp[ZuoraDeps, CreatePaymentMethodResult] =
    post[CreateStripePaymentMethod, CreatePaymentMethodResult](request, s"object/payment-method")

}
