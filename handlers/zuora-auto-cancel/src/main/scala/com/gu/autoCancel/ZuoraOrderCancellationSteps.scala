package com.gu.autoCancel

import com.gu.autoCancel.AutoCancel.{AutoCancelRequest, CancellationResponse}
import com.gu.util.resthttp.RestRequestMaker.Requests
import com.gu.util.resthttp.Types.{ClientFailableOp, GenericError}
import com.gu.util.zuora.ZuoraGetInvoice
import com.gu.zuora.orders.CreateOrderRequest
import com.gu.zuora.subscription.ZuoraApiResponse
import com.gu.zuora.{AccessToken, HolidayStopProcessorZuoraConfig, Zuora, ZuoraOrders}
import sttp.client3.{Identity, SttpBackend}

import java.time.LocalDate
import scala.concurrent.duration.{DurationInt, FiniteDuration}

trait SubscriptionCancellation {
  def cancel(request: AutoCancelRequest): ClientFailableOp[CancellationResponse]
}

trait SubscriptionCancellationFactory {
  def create(deadline: Deadline, orderDate: LocalDate): ClientFailableOp[SubscriptionCancellation]
}

object ZuoraOrderCancellationSteps {
  private val PostOrderWorkBuffer = 2.minutes
  private val MinimumOrderDuration = 10.seconds

  def factory(
      requests: Requests,
      config: HolidayStopProcessorZuoraConfig,
      backend: SttpBackend[Identity, Any],
  ): SubscriptionCancellationFactory =
    new SubscriptionCancellationFactory {
      override def create(deadline: Deadline, orderDate: LocalDate): ClientFailableOp[SubscriptionCancellation] =
        toClientResult(Zuora.accessTokenGetResponse(config, backend))
          .map(accessToken =>
            new ZuoraOrderCancellationSteps(requests, config, accessToken, backend, deadline, orderDate),
          )
    }

  private def toClientResult[A](response: ZuoraApiResponse[A]): ClientFailableOp[A] =
    response.left.map(failure => GenericError(failure.reason)).toClientFailableOp

  private[autoCancel] def singleInvoiceNumber(invoiceNumbers: Option[List[String]]): Either[GenericError, String] =
    invoiceNumbers match {
      case Some(invoiceNumber :: Nil) => Right(invoiceNumber)
      case Some(Nil) => Left(GenericError("Zuora completed the cancellation order without generating an invoice"))
      case Some(_) => Left(GenericError("Zuora generated more than one invoice for a single subscription cancellation"))
      case None => Left(GenericError("Zuora completed the cancellation order without returning invoice numbers"))
    }

  private[autoCancel] def orderDuration(remainingTimeInMillis: Int): Option[FiniteDuration] = {
    val availableDuration = remainingTimeInMillis.millis - PostOrderWorkBuffer
    Option.when(availableDuration >= MinimumOrderDuration) {
      if (availableDuration < ZuoraOrders.MaximumOrderDuration) availableDuration
      else ZuoraOrders.MaximumOrderDuration
    }
  }
}

class ZuoraOrderCancellationSteps(
    requests: Requests,
    config: HolidayStopProcessorZuoraConfig,
    accessToken: AccessToken,
    backend: SttpBackend[Identity, Any],
    deadline: Deadline,
    orderDate: LocalDate,
) extends SubscriptionCancellation {
  import ZuoraOrderCancellationSteps._

  override def cancel(request: AutoCancelRequest): ClientFailableOp[CancellationResponse] =
    for {
      maximumOrderDuration <- orderDuration(deadline.remainingTimeInMillis)
        .toRight(
          GenericError("Not enough Lambda time remains to safely submit the Zuora cancellation order"),
        )
        .toClientFailableOp
      orderResult <- toClientResult(
        ZuoraOrders.createOrderAsynchronously(config, accessToken, backend, maximumOrderDuration)(
          CreateOrderRequest.forCancellation(
            accountId = request.accountId,
            subscriptionNumber = request.subToCancel.value,
            cancellationDate = request.cancellationDate,
            orderDate = orderDate,
          ),
        ),
      )
      invoiceNumber <- singleInvoiceNumber(orderResult.invoiceNumbers).toClientFailableOp
      invoiceId <- ZuoraGetInvoice(requests)(invoiceNumber)
    } yield CancellationResponse(invoiceId)
}
