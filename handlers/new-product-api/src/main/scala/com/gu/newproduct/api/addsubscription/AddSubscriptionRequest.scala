package com.gu.newproduct.api.addsubscription

import com.gu.newproduct.api.productcatalog.ZuoraIds.ProductRatePlanId

import java.time.LocalDate
import com.gu.newproduct.api.productcatalog.{AmountMinorUnits, PlanId}
import play.api.libs.json.{JsError, JsSuccess, Json, Reads}

import scala.util.Try

case class ZuoraAccountId(value: String) extends AnyVal
case class AddSubscriptionRequest(
    zuoraAccountId: ZuoraAccountId,
    startDate: LocalDate,
    acquisitionSource: AcquisitionSource,
    deliveryAgent: Option[DeliveryAgent],
    createdByCSR: CreatedByCSR,
    amountMinorUnits: Option[AmountMinorUnits],
    acquisitionCase: CaseId,
    planId: PlanId,
    discountRatePlanId: Option[ProductRatePlanId],
)

case class CaseId(value: String) extends AnyVal
case class AcquisitionSource(value: String) extends AnyVal
case class DeliveryAgent(value: String) extends AnyVal
case class CreatedByCSR(value: String) extends AnyVal
object AddSubscriptionRequest {

  case class AddSubscriptionRequestWire(
      zuoraAccountId: String,
      startDate: String,
      acquisitionSource: String,
      deliveryAgent: Option[String],
      createdByCSR: String,
      amountMinorUnits: Option[Int],
      acquisitionCase: String,
      planId: String,
      discountRatePlanId: Option[String],
  ) {
    def toAddSubscriptionRequest = {
      val parsedRequestOrError = for {
        parsedDate <- Try(LocalDate.parse(startDate)).toEither.left.map(_ => "invalid date format")
        parsedPlanId <- PlanId.fromName(planId).toRight(invalidPlanError)
      } yield AddSubscriptionRequest(
        zuoraAccountId = ZuoraAccountId(zuoraAccountId),
        startDate = parsedDate,
        acquisitionSource = AcquisitionSource(this.acquisitionSource),
        deliveryAgent = deliveryAgent.map(DeliveryAgent.apply),
        createdByCSR = CreatedByCSR(this.createdByCSR),
        amountMinorUnits = amountMinorUnits.map(AmountMinorUnits.apply),
        CaseId(acquisitionCase),
        parsedPlanId,
        discountRatePlanId = discountRatePlanId.map(ProductRatePlanId.apply),
      )

      parsedRequestOrError match {
        case Right(req) => JsSuccess(req)
        case Left(error) => JsError(error)
      }

    }
    def invalidPlanError = {
      val validValues = PlanId.supportedPlans.map(_.name).mkString(",")
      s"unsupported plan: allowed values are $validValues"
    }
  }

  val wireReads = Json.reads[AddSubscriptionRequestWire]
  implicit val reads: Reads[AddSubscriptionRequest] = json => wireReads.reads(json).flatMap(_.toAddSubscriptionRequest)
}
