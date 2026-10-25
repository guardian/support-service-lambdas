package com.gu.util.zuora

import com.gu.autoCancel.AutoCancel.{AutoCancelRequest, CancellationResponse}
import com.gu.util.resthttp.RestRequestMaker.Requests
import com.gu.util.resthttp.Types.{ClientFailableOp, ClientSuccess, GenericError}
import play.api.libs.json._

import java.nio.charset.StandardCharsets.UTF_8
import java.time.LocalDate
import java.util.UUID

trait SubscriptionCancellation {
  def cancel(
      request: AutoCancelRequest,
      calloutInvoiceId: String,
      orderDate: LocalDate,
  ): ClientFailableOp[CancellationResponse]
}

class ZuoraOrderCancellation(requests: Requests) extends SubscriptionCancellation {
  import ZuoraOrderCancellation._

  override def cancel(
      request: AutoCancelRequest,
      calloutInvoiceId: String,
      orderDate: LocalDate,
  ): ClientFailableOp[CancellationResponse] =
    for {
      result <- requests.post[JsValue, OrderResult](
        orderBody(request, orderDate),
        "orders?returnIds=true",
        additionalHeaders = Map("Idempotency-Key" -> idempotencyKey(request, calloutInvoiceId)),
      )
      _ <-
        if (result.status.contains("Completed")) ClientSuccess(())
        else GenericError(s"Zuora cancellation order did not complete: ${result.status.getOrElse("missing status")}")
      invoiceId <- singleInvoiceId(result.invoiceIds).toClientFailableOp
    } yield CancellationResponse(invoiceId)
}

object ZuoraOrderCancellation {
  private case class OrderResult(status: Option[String], invoiceIds: Option[List[String]])
  private implicit val orderResultReads: Reads[OrderResult] = Json.reads[OrderResult]

  private def orderBody(request: AutoCancelRequest, orderDate: LocalDate): JsValue =
    Json.obj(
      "orderDate" -> orderDate,
      "existingAccountId" -> request.accountId,
      "subscriptions" -> Json.arr(
        Json.obj(
          "subscriptionNumber" -> request.subToCancel.value,
          "orderActions" -> Json.arr(
            Json.obj(
              "type" -> "CancelSubscription",
              "triggerDates" -> Json.arr(
                Json.obj("name" -> "ContractEffective", "triggerDate" -> request.cancellationDate),
              ),
              "cancelSubscription" -> Json.obj(
                "cancellationPolicy" -> "SpecificDate",
                "cancellationEffectiveDate" -> request.cancellationDate,
              ),
            ),
          ),
        ),
      ),
      "processingOptions" -> Json.obj("runBilling" -> true, "collectPayment" -> false),
    )

  private def singleInvoiceId(invoiceIds: Option[List[String]]): Either[GenericError, String] =
    invoiceIds match {
      case Some(invoiceId :: Nil) if invoiceId.trim.nonEmpty => Right(invoiceId)
      case Some(Nil) => Left(GenericError("Zuora completed the cancellation order without generating an invoice"))
      case Some(_ :: Nil) => Left(GenericError("Zuora completed the cancellation order with an empty invoice ID"))
      case Some(_) => Left(GenericError("Zuora generated more than one invoice for a single subscription cancellation"))
      case None => Left(GenericError("Zuora completed the cancellation order without returning invoice IDs"))
    }

  private def idempotencyKey(request: AutoCancelRequest, calloutInvoiceId: String): String =
    "auto-cancel-" + UUID
      .nameUUIDFromBytes(
        s"${request.accountId}:$calloutInvoiceId:${request.subToCancel.value}".getBytes(UTF_8),
      )
      .toString
}
