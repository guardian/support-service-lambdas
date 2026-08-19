package com.gu.zuora.orders

import com.gu.zuora.subscription.{CreditProductAddition, Subscription, SubscriptionUpdate}
import io.circe.{Encoder, Json}
import io.circe.generic.auto._
import io.circe.syntax._

import java.time.LocalDate

case class CreateOrderRequest(
    orderDate: LocalDate,
    existingAccount: ExistingAccount,
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
      existingAccount = ExistingAccount.Number(subscription.accountNumber),
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

  /** https://developer.zuora.com/docs/get-started/tutorials/cancel-subscription */
  def forCancellation(
      accountId: String,
      subscriptionNumber: String,
      cancellationDate: LocalDate,
      orderDate: LocalDate,
  ): CreateOrderRequest =
    CreateOrderRequest(
      orderDate = orderDate,
      existingAccount = ExistingAccount.Id(accountId),
      subscriptions = List(
        OrderSubscription(
          subscriptionNumber = subscriptionNumber,
          orderActions = List(
            CancelSubscriptionOrderAction(
              triggerDates = List(TriggerDate(TriggerDateName.ContractEffective, cancellationDate)),
              cancelSubscription = Cancellation(SpecificDate, cancellationDate),
            ),
          ),
        ),
      ),
      processingOptions = ProcessingOptions(runBilling = true, collectPayment = false),
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

  implicit val encoder: Encoder[CreateOrderRequest] = Encoder.instance { request =>
    Json.obj(
      "orderDate" -> request.orderDate.asJson,
      request.existingAccount.jsonField -> request.existingAccount.value.asJson,
      "subscriptions" -> request.subscriptions.asJson,
      "processingOptions" -> request.processingOptions.asJson,
    )
  }
}

sealed trait ExistingAccount {
  def jsonField: String
  def value: String
}

object ExistingAccount {
  case class Number(value: String) extends ExistingAccount {
    override val jsonField = "existingAccountNumber"
  }

  case class Id(value: String) extends ExistingAccount {
    override val jsonField = "existingAccountId"
  }
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
    case action: CancelSubscriptionOrderAction =>
      Json.obj(
        "type" -> Json.fromString("CancelSubscription"),
        "triggerDates" -> action.triggerDates.asJson,
        "cancelSubscription" -> action.cancelSubscription.asJson,
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

case class CancelSubscriptionOrderAction(
    triggerDates: List[TriggerDate],
    cancelSubscription: Cancellation,
) extends OrderAction

case class Cancellation(cancellationPolicy: CancellationPolicy, cancellationEffectiveDate: LocalDate)

sealed trait CancellationPolicy {
  def value: String
}

case object SpecificDate extends CancellationPolicy {
  override val value: String = "SpecificDate"
}

object CancellationPolicy {
  implicit val encoder: Encoder[CancellationPolicy] = Encoder.encodeString.contramap(_.value)
}

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
