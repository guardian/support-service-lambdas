package com.gu.productmove.zuora

import com.gu.productmove.zuora.model.{AccountNumber, SubscriptionName}
import com.gu.productmove.zuora.rest.{ZuoraClient, ZuoraRestBody}
import sttp.client3.{basicRequest, UriContext}
import zio.json.*
import zio.{Task, URLayer, ZIO, ZLayer}

import java.time.LocalDate
import scala.concurrent.duration.DurationInt

trait ZuoraCancel {
  def cancel(
      accountNumber: AccountNumber,
      subscriptionName: SubscriptionName,
      cancellationEffectiveDate: LocalDate,
      orderDate: LocalDate,
  ): Task[Unit]
}

object ZuoraCancelLive {
  val layer: URLayer[ZuoraClient, ZuoraCancel] = ZLayer.fromFunction(ZuoraCancelLive(_))
}

private class ZuoraCancelLive(zuoraClient: ZuoraClient) extends ZuoraCancel {
  override def cancel(
      accountNumber: AccountNumber,
      subscriptionName: SubscriptionName,
      cancellationEffectiveDate: LocalDate,
      orderDate: LocalDate,
  ): Task[Unit] = {
    val request = CancellationOrderRequest.forSubscription(
      accountNumber,
      subscriptionName,
      cancellationEffectiveDate,
      orderDate,
    )
    createOrder(request, subscriptionName)
  }

  private def createOrder(
      request: CancellationOrderRequest,
      subscriptionName: SubscriptionName,
  ): Task[Unit] =
    for {
      result <- submit(request)
      _ <- result.status match {
        case OrderStatus.Completed => ZIO.log(s"Cancellation order completed for ${subscriptionName.value}")
        case status => ZIO.fail(new Throwable(s"Cancellation order completed with status ${status.value}"))
      }
    } yield ()

  /** https://developer.zuora.com/v1-api-reference/api/orders/post_order */
  private def submit(request: CancellationOrderRequest): Task[OrderResult] =
    for {
      body <- zuoraClient.send(
        basicRequest
          .contentType("application/json")
          .body(request.toJson)
          .readTimeout(ZuoraCancel.MaximumOrderRequestDuration)
          .post(uri"orders"),
      )
      result <- ZIO.fromEither(
        ZuoraRestBody.parseIfSuccessful[OrderResult](body, ZuoraRestBody.ZuoraSuccessCheck.SuccessCheckLowercase),
      )
    } yield result
}

object ZuoraCancel {
  private[zuora] val MaximumOrderRequestDuration = 18.seconds
}

case class CancellationOrderRequest(
    orderDate: LocalDate,
    existingAccountNumber: String,
    subscriptions: List[OrderSubscription],
    processingOptions: ProcessingOptions,
) derives JsonEncoder

object CancellationOrderRequest {
  def forSubscription(
      accountNumber: AccountNumber,
      subscriptionName: SubscriptionName,
      cancellationEffectiveDate: LocalDate,
      orderDate: LocalDate,
  ): CancellationOrderRequest =
    CancellationOrderRequest(
      orderDate = orderDate,
      existingAccountNumber = accountNumber.value,
      subscriptions = List(
        OrderSubscription(
          subscriptionNumber = subscriptionName.value,
          orderActions = List(
            CancelSubscriptionOrderAction(
              triggerDates = List(TriggerDate(TriggerDateName.ContractEffective, cancellationEffectiveDate)),
              cancelSubscription = Cancellation(CancellationPolicy.SpecificDate, cancellationEffectiveDate),
            ),
          ),
        ),
      ),
      processingOptions = ProcessingOptions(runBilling = false, collectPayment = false),
    )
}

case class OrderSubscription(subscriptionNumber: String, orderActions: List[CancelSubscriptionOrderAction])
    derives JsonEncoder

case class CancelSubscriptionOrderAction(
    `type`: String = "CancelSubscription",
    triggerDates: List[TriggerDate],
    cancelSubscription: Cancellation,
) derives JsonEncoder

case class TriggerDate(name: TriggerDateName, triggerDate: LocalDate) derives JsonEncoder

enum TriggerDateName(val value: String) {
  case ContractEffective extends TriggerDateName("ContractEffective")
}

object TriggerDateName {
  given JsonEncoder[TriggerDateName] = JsonEncoder.string.contramap(_.value)
}

case class Cancellation(cancellationPolicy: CancellationPolicy, cancellationEffectiveDate: LocalDate)
    derives JsonEncoder

enum CancellationPolicy(val value: String) {
  case SpecificDate extends CancellationPolicy("SpecificDate")
}

object CancellationPolicy {
  given JsonEncoder[CancellationPolicy] = JsonEncoder.string.contramap(_.value)
}

case class ProcessingOptions(runBilling: Boolean, collectPayment: Boolean) derives JsonEncoder

case class OrderResult(status: OrderStatus) derives JsonDecoder

enum OrderStatus(val value: String) {
  case Draft extends OrderStatus("Draft")
  case Pending extends OrderStatus("Pending")
  case Completed extends OrderStatus("Completed")
  case Cancelled extends OrderStatus("Cancelled")
  case Scheduled extends OrderStatus("Scheduled")
  case Executing extends OrderStatus("Executing")
  case Failed extends OrderStatus("Failed")
}

object OrderStatus {
  given JsonDecoder[OrderStatus] = JsonDecoder[String].mapOrFail {
    case "Draft" => Right(OrderStatus.Draft)
    case "Pending" => Right(OrderStatus.Pending)
    case "Completed" => Right(OrderStatus.Completed)
    case "Cancelled" => Right(OrderStatus.Cancelled)
    case "Scheduled" => Right(OrderStatus.Scheduled)
    case "Executing" => Right(OrderStatus.Executing)
    case "Failed" => Right(OrderStatus.Failed)
    case status => Left(s"Unknown Zuora order status: $status")
  }
}
