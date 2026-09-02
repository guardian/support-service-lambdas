package com.gu.newproduct.api.addsubscription.zuora

import java.time.LocalDate
import java.time.format.DateTimeFormatter
import com.gu.newproduct.api.addsubscription._
import com.gu.newproduct.api.addsubscription.zuora.GetAccount.AccountNumber
import com.gu.newproduct.api.productcatalog.AmountMinorUnits
import com.gu.newproduct.api.productcatalog.ZuoraIds.{ProductRatePlanChargeId, ProductRatePlanId}
import com.gu.util.resthttp.ClientFailableOpLogging.LogImplicit2
import com.gu.util.resthttp.RestRequestMaker.{RequestsPost, WithCheck}
import com.gu.util.resthttp.Types.{ClientFailableOp, ClientSuccess, GenericError}
import play.api.libs.json.{JsObject, Json, OWrites, Reads}

object CreateSubscription {
  object WireModel {

    case class WireOrderResponse(subscriptionNumbers: List[String])

    implicit val readsResponse: Reads[WireOrderResponse] = Json.reads[WireOrderResponse]

    case class ChargeStartDate(triggerEvent: String, specificTriggerDate: String)

    implicit val writesChargeStartDate: OWrites[ChargeStartDate] = Json.writes[ChargeStartDate]

    case class RecurringFlatFee(listPrice: Double)

    implicit val writesRecurringFlatFee: OWrites[RecurringFlatFee] = Json.writes[RecurringFlatFee]

    case class Pricing(recurringFlatFee: RecurringFlatFee)

    implicit val writesPricing: OWrites[Pricing] = Json.writes[Pricing]

    case class ChargeOverride(
        productRatePlanChargeId: String,
        pricing: Option[Pricing],
        startDate: Option[ChargeStartDate],
    )

    implicit val writesChargeOverride: OWrites[ChargeOverride] = OWrites { chargeOverride =>
      Json.obj("productRatePlanChargeId" -> chargeOverride.productRatePlanChargeId) ++
        chargeOverride.pricing.fold(JsObject.empty)(pricing => Json.obj("pricing" -> pricing)) ++
        chargeOverride.startDate.fold(JsObject.empty)(startDate => Json.obj("startDate" -> startDate))
    }

    case class SubscribeToRatePlan(productRatePlanId: String, chargeOverrides: List[ChargeOverride])

    implicit val writesSubscribeToRatePlan: OWrites[SubscribeToRatePlan] = Json.writes[SubscribeToRatePlan]

    case class InitialTerm(termType: String, period: Int, periodType: String)

    implicit val writesInitialTerm: OWrites[InitialTerm] = Json.writes[InitialTerm]

    case class RenewalTerm(period: Int, periodType: String)

    implicit val writesRenewalTerm: OWrites[RenewalTerm] = Json.writes[RenewalTerm]

    case class Terms(
        autoRenew: Boolean,
        initialTerm: InitialTerm,
        renewalSetting: String,
        renewalTerms: List[RenewalTerm],
    )

    implicit val writesTerms: OWrites[Terms] = Json.writes[Terms]

    case class CreateSubscriptionAction(terms: Terms, subscribeToRatePlans: List[SubscribeToRatePlan])

    implicit val writesCreateSubscriptionAction: OWrites[CreateSubscriptionAction] =
      Json.writes[CreateSubscriptionAction]

    case class TriggerDate(name: String, triggerDate: String)

    implicit val writesTriggerDate: OWrites[TriggerDate] = Json.writes[TriggerDate]

    case class OrderAction(
        `type`: String,
        triggerDates: List[TriggerDate],
        createSubscription: CreateSubscriptionAction,
    )

    implicit val writesOrderAction: OWrites[OrderAction] = Json.writes[OrderAction]

    case class SubscriptionCustomFields(
        acquisitionCase: String,
        acquisitionSource: String,
        createdByCSR: String,
        deliveryAgent: Option[String],
        lastPlanAddedDate: String,
    )

    implicit val writesSubscriptionCustomFields: OWrites[SubscriptionCustomFields] = OWrites { customFields =>
      Json.obj(
        "AcquisitionCase__c" -> customFields.acquisitionCase,
        "AcquisitionSource__c" -> customFields.acquisitionSource,
        "CreatedByCSR__c" -> customFields.createdByCSR,
        "LastPlanAddedDate__c" -> customFields.lastPlanAddedDate,
      ) ++ customFields.deliveryAgent.fold(JsObject.empty)(deliveryAgent =>
        Json.obj("DeliveryAgent__c" -> deliveryAgent),
      )
    }

    case class OrderSubscription(orderActions: List[OrderAction], customFields: SubscriptionCustomFields)

    implicit val writesOrderSubscription: OWrites[OrderSubscription] = Json.writes[OrderSubscription]

    case class ProcessingOptions(runBilling: Boolean, collectPayment: Boolean)

    implicit val writesProcessingOptions: OWrites[ProcessingOptions] = Json.writes[ProcessingOptions]

    case class WireCreateOrderRequest(
        orderDate: String,
        existingAccountNumber: String,
        subscriptions: List[OrderSubscription],
        processingOptions: ProcessingOptions,
    )

    implicit val writesRequest: OWrites[WireCreateOrderRequest] = Json.writes[WireCreateOrderRequest]
  }

  import WireModel._

  private val DateFormat = DateTimeFormatter.ISO_LOCAL_DATE

  private def zuoraDate(date: LocalDate): String = date.format(DateFormat)

  def createRequest(currentDate: LocalDate, createSubscription: ZuoraCreateSubRequest): WireCreateOrderRequest = {
    import createSubscription._
    val contractEffectiveDate = zuoraDate(currentDate)

    WireCreateOrderRequest(
      orderDate = contractEffectiveDate,
      existingAccountNumber = accountNumber.value,
      subscriptions = List(
        OrderSubscription(
          orderActions = List(
            OrderAction(
              `type` = "CreateSubscription",
              triggerDates = List(
                TriggerDate("ContractEffective", contractEffectiveDate),
                TriggerDate("CustomerAcceptance", zuoraDate(acceptanceDate)),
              ),
              createSubscription = CreateSubscriptionAction(
                terms = Terms(
                  autoRenew = true,
                  initialTerm = InitialTerm("TERMED", 12, "Month"),
                  renewalSetting = "RENEW_WITH_SPECIFIC_TERM",
                  renewalTerms = List(RenewalTerm(12, "Month")),
                ),
                subscribeToRatePlans = ratePlans.map { ratePlan =>
                  SubscribeToRatePlan(
                    productRatePlanId = ratePlan.productRatePlanId.value,
                    chargeOverrides = ratePlan.maybeChargeOverride.map { chargeOverride =>
                      WireModel.ChargeOverride(
                        productRatePlanChargeId = chargeOverride.productRatePlanChargeId.value,
                        pricing = chargeOverride.amountMinorUnits.map(amount =>
                          Pricing(RecurringFlatFee(amount.value.toDouble / 100)),
                        ),
                        startDate =
                          chargeOverride.triggerDate.map(date => ChargeStartDate("SpecificDate", zuoraDate(date))),
                      )
                    }.toList,
                  )
                },
              ),
            ),
          ),
          customFields = SubscriptionCustomFields(
            acquisitionCase = acquisitionCase.value,
            acquisitionSource = acquisitionSource.value,
            createdByCSR = createdByCSR.value,
            deliveryAgent = deliveryAgent.map(_.value),
            lastPlanAddedDate = contractEffectiveDate,
          ),
        ),
      ),
      processingOptions = ProcessingOptions(runBilling = true, collectPayment = true),
    )
  }

  case class ChargeOverride(
      amountMinorUnits: Option[AmountMinorUnits],
      productRatePlanChargeId: ProductRatePlanChargeId,
      triggerDate: Option[LocalDate],
  )

  case class ZuoraCreateSubRequest(
      accountNumber: AccountNumber,
      acceptanceDate: LocalDate,
      acquisitionCase: CaseId,
      acquisitionSource: AcquisitionSource,
      createdByCSR: CreatedByCSR,
      deliveryAgent: Option[DeliveryAgent],
      ratePlans: List[ZuoraCreateSubRequestRatePlan],
  )

  case class ZuoraCreateSubRequestRatePlan(
      productRatePlanId: ProductRatePlanId,
      maybeChargeOverride: Option[ChargeOverride],
  )

  object ZuoraCreateSubRequest {
    def apply(
        request: AddSubscriptionRequest,
        accountNumber: AccountNumber,
        acceptanceDate: LocalDate,
        ratePlans: List[ZuoraCreateSubRequestRatePlan],
    ): ZuoraCreateSubRequest = ZuoraCreateSubRequest(
      accountNumber = accountNumber,
      acceptanceDate = acceptanceDate,
      acquisitionCase = request.acquisitionCase,
      acquisitionSource = request.acquisitionSource,
      createdByCSR = request.createdByCSR,
      deliveryAgent = request.deliveryAgent,
      ratePlans = ratePlans,
    )
  }

  case class SubscriptionName(value: String) extends AnyVal

  def apply(
      post: RequestsPost[WireCreateOrderRequest, WireOrderResponse],
      currentDate: () => LocalDate,
  )(createSubscription: ZuoraCreateSubRequest): ClientFailableOp[SubscriptionName] =
    // https://developer.zuora.com/v1-api-reference/api/operation/POST_Order/
    post(createRequest(currentDate(), createSubscription), "orders", WithCheck)
      .flatMap {
        case WireOrderResponse(subscriptionNumber :: Nil) => ClientSuccess(SubscriptionName(subscriptionNumber))
        case WireOrderResponse(subscriptionNumbers) =>
          GenericError(s"expected one subscription number from Zuora Orders, received ${subscriptionNumbers.size}")
      }
      .withLogging("created subscription")
}
