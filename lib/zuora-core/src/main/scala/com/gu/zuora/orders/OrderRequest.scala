package com.gu.zuora.orders

import com.gu.zuora.subscription.{Add, Subscription, SubscriptionUpdate, ZuoraApiFailure, ZuoraApiResponse}
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
  ): ZuoraApiResponse[CreateOrderRequest] =
    update.add match {
      case add :: Nil =>
        for {
          _ <- validateChargeOverrides(add)
          maybeTermsAndConditions <- termsAndConditionsAction(subscription, update, orderDate)
        } yield {
          CreateOrderRequest(
            orderDate = orderDate,
            existingAccountNumber = subscription.accountNumber,
            subscriptions = List(
              OrderSubscription(
                subscriptionNumber = subscription.subscriptionNumber,
                orderActions = maybeTermsAndConditions.toList :+ addProductAction(add),
              ),
            ),
            processingOptions = ProcessingOptions(runBilling = false, collectPayment = false),
          )
        }
      case _ => Left(ZuoraApiFailure("A credit order must add exactly one product rate plan"))
    }

  private def validateChargeOverrides(add: Add): ZuoraApiResponse[Unit] =
    add.chargeOverrides match {
      case _ :: Nil => Right(())
      case _ => Left(ZuoraApiFailure("A credit order must contain exactly one price override"))
    }

  private def termsAndConditionsAction(
      subscription: Subscription,
      update: SubscriptionUpdate,
      orderDate: LocalDate,
  ): ZuoraApiResponse[Option[TermsAndConditionsOrderAction]] =
    (update.currentTerm, update.currentTermPeriodType) match {
      case (None, None) => Right(None)
      case (Some(currentTerm), Some("Day")) if currentTerm >= 0 =>
        Right(
          Some(
            TermsAndConditionsOrderAction(
              triggerDates = TriggerDate.allOn(orderDate),
              termsAndConditions = TermsAndConditions(
                lastTerm = LastTerm(
                  termType = TermType.Termed,
                  endDate = subscription.termStartDate.plusDays(currentTerm.toLong),
                ),
              ),
            ),
          ),
        )
      case _ => Left(ZuoraApiFailure("A credit order can only extend a subscription term by days"))
    }

  private def addProductAction(add: Add): AddProductOrderAction =
    AddProductOrderAction(
      triggerDates = List(
        TriggerDate(TriggerDateName.ContractEffective, add.contractEffectiveDate),
        TriggerDate(TriggerDateName.ServiceActivation, add.serviceActivationDate),
        TriggerDate(TriggerDateName.CustomerAcceptance, add.customerAcceptanceDate),
      ),
      addProduct = ProductToAdd(
        productRatePlanId = add.productRatePlanId,
        chargeOverrides = add.chargeOverrides.map { chargeOverride =>
          ChargeOverride(
            productRatePlanChargeId = chargeOverride.productRatePlanChargeId,
            customFields = RatePlanChargeCustomFields(
              HolidayStart__c = chargeOverride.HolidayStart__c,
              HolidayEnd__c = chargeOverride.HolidayEnd__c,
            ),
            pricing = Pricing(
              oneTimeFlatFee = OneTimeFlatFee(listPrice = chargeOverride.price),
            ),
          )
        },
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
    customFields: RatePlanChargeCustomFields,
    pricing: Pricing,
)

case class RatePlanChargeCustomFields(
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
