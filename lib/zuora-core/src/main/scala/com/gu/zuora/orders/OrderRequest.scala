package com.gu.zuora.orders

import com.gu.zuora.subscription.{CreditProductAddition, Subscription, SubscriptionUpdate}
import io.circe.{Encoder, Json}
import io.circe.generic.auto._
import io.circe.syntax._

import java.time.LocalDate

case class CreateOrderRequest(
    orderDate: LocalDate,
    existingAccountNumber: String,
    subscriptions: List[OrderSubscription],
    processingOptions: ProcessingOptions,
)

object CreateOrderRequest {
  def forCredit(
      subscription: Subscription,
      update: SubscriptionUpdate,
      orderDate: LocalDate,
  ): CreateOrderRequest =
    CreateOrderRequest(
      orderDate = orderDate,
      existingAccountNumber = subscription.accountNumber,
      subscriptions = List(
        OrderSubscription(
          subscriptionNumber = subscription.subscriptionNumber,
          orderActions = termsAndConditionsAction(update, orderDate).toList :+ addProductAction(
            update.productAddition,
          ),
        ),
      ),
      processingOptions = ProcessingOptions(runBilling = false, collectPayment = false),
    )

  private def termsAndConditionsAction(
      update: SubscriptionUpdate,
      orderDate: LocalDate,
  ): Option[TermsAndConditionsOrderAction] =
    update.extendedTermEndDate.map { extendedTermEndDate =>
      TermsAndConditionsOrderAction(
        triggerDates = TriggerDate.allOn(orderDate),
        termsAndConditions = TermsAndConditions(
          lastTerm = LastTerm(
            termType = TermType.Termed,
            endDate = extendedTermEndDate,
          ),
        ),
      )
    }

  private def addProductAction(productAddition: CreditProductAddition): AddProductOrderAction =
    AddProductOrderAction(
      triggerDates = List(
        TriggerDate(TriggerDateName.ContractEffective, productAddition.contractEffectiveDate),
        TriggerDate(TriggerDateName.ServiceActivation, productAddition.serviceActivationDate),
        TriggerDate(TriggerDateName.CustomerAcceptance, productAddition.customerAcceptanceDate),
      ),
      addProduct = ProductToAdd(
        productRatePlanId = productAddition.productRatePlanId,
        chargeOverrides = List(
          ChargeOverride(
            productRatePlanChargeId = productAddition.chargeOverride.productRatePlanChargeId,
            customFields = CreditCustomFields(
              HolidayStart__c = productAddition.chargeOverride.HolidayStart__c,
              HolidayEnd__c = productAddition.chargeOverride.HolidayEnd__c,
            ),
            pricing = Pricing(
              oneTimeFlatFee = OneTimeFlatFee(listPrice = productAddition.chargeOverride.price),
            ),
          ),
        ),
      ),
    )
}

case class OrderSubscription(
    subscriptionNumber: String,
    orderActions: List[OrderAction],
)

sealed trait OrderAction

object OrderAction {
  implicit val encoder: Encoder[OrderAction] = Encoder.instance {
    case action: AddProductOrderAction =>
      Json.obj(
        "type" -> Json.fromString("AddProduct"),
        "triggerDates" -> action.triggerDates.asJson,
        "addProduct" -> action.addProduct.asJson,
      )
    case action: TermsAndConditionsOrderAction =>
      Json.obj(
        "type" -> Json.fromString("TermsAndConditions"),
        "triggerDates" -> action.triggerDates.asJson,
        "termsAndConditions" -> action.termsAndConditions.asJson,
      )
  }
}

case class AddProductOrderAction(
    triggerDates: List[TriggerDate],
    addProduct: ProductToAdd,
) extends OrderAction

case class TermsAndConditionsOrderAction(
    triggerDates: List[TriggerDate],
    termsAndConditions: TermsAndConditions,
) extends OrderAction

case class ProductToAdd(
    productRatePlanId: String,
    chargeOverrides: List[ChargeOverride],
)

case class ChargeOverride(
    productRatePlanChargeId: String,
    customFields: CreditCustomFields,
    pricing: Pricing,
)

case class CreditCustomFields(
    HolidayStart__c: LocalDate,
    HolidayEnd__c: LocalDate,
)

case class Pricing(oneTimeFlatFee: OneTimeFlatFee)

case class OneTimeFlatFee(listPrice: Double)

case class TermsAndConditions(lastTerm: LastTerm)

case class LastTerm(termType: TermType, endDate: LocalDate)

sealed trait TermType {
  def value: String
}

object TermType {
  case object Termed extends TermType {
    override val value: String = "TERMED"
  }

  implicit val encoder: Encoder[TermType] = Encoder.encodeString.contramap(_.value)
}

case class ProcessingOptions(runBilling: Boolean, collectPayment: Boolean)

sealed trait TriggerDateName {
  def value: String
}

object TriggerDateName {
  case object ContractEffective extends TriggerDateName {
    override val value: String = "ContractEffective"
  }
  case object ServiceActivation extends TriggerDateName {
    override val value: String = "ServiceActivation"
  }
  case object CustomerAcceptance extends TriggerDateName {
    override val value: String = "CustomerAcceptance"
  }

  implicit val encoder: Encoder[TriggerDateName] = Encoder.encodeString.contramap(_.value)
}

case class TriggerDate(name: TriggerDateName, triggerDate: LocalDate)

object TriggerDate {
  def allOn(date: LocalDate): List[TriggerDate] =
    List(
      TriggerDate(TriggerDateName.ContractEffective, date),
      TriggerDate(TriggerDateName.ServiceActivation, date),
      TriggerDate(TriggerDateName.CustomerAcceptance, date),
    )
}
