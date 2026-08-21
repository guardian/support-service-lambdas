package com.gu.productmove.zuora

import com.gu.productmove.zuora.model.{AccountNumber, SubscriptionName}
import com.gu.productmove.zuora.rest.{ZuoraClient, ZuoraRestBody}
import com.gu.productmove.framework.LambdaRemainingTime
import sttp.client3.{basicRequest, UriContext}
import zio.json.*
import zio.{Clock, Duration, Task, URLayer, ZIO, ZLayer}

import java.time.LocalDate
import scala.concurrent.duration.{DurationInt, FiniteDuration, NANOSECONDS}

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
  ): Task[Unit] =
    for {
      remainingTime <- LambdaRemainingTime.remaining
      maximumOrderDuration <- ZIO
        .fromOption(ZuoraCancel.orderDuration(remainingTime))
        .orElseFail(new Throwable("Not enough Lambda time remains to safely submit the Zuora cancellation order"))
      deadline <- Clock.nanoTime.map(_ + maximumOrderDuration.toNanos)
      request = CancellationOrderRequest.forSubscription(
        accountNumber,
        subscriptionName,
        cancellationEffectiveDate,
        orderDate,
      )
      _ <- createOrder(request, subscriptionName, deadline).catchSome { case failure: LockingContention =>
        retryAfterLockingContention(request, subscriptionName, deadline, failure)
      }
    } yield ()

  private def createOrder(
      request: CancellationOrderRequest,
      subscriptionName: SubscriptionName,
      deadline: Long,
  ): Task[Unit] =
    for {
      submissionTimeout <- readTimeout(deadline)
      jobId <- submit(request, submissionTimeout)
      _ <- ZIO.log(s"Submitted cancellation order job $jobId for ${subscriptionName.value}")
      _ <- waitForCompletion(jobId, deadline)
      _ <- ZIO.log(s"Cancellation order job $jobId completed for ${subscriptionName.value}")
    } yield ()

  private def retryAfterLockingContention(
      request: CancellationOrderRequest,
      subscriptionName: SubscriptionName,
      deadline: Long,
      failure: LockingContention,
  ): Task[Unit] =
    remainingDuration(deadline).flatMap {
      case Some(remaining) if remaining > ZuoraCancel.LockingContentionRetryDelay + ZuoraCancel.MinimumOrderDuration =>
        ZIO.logWarning(
          s"Retrying cancellation for ${subscriptionName.value} after locking contention: ${failure.getMessage}",
        ) *> ZIO.sleep(Duration.fromScala(ZuoraCancel.LockingContentionRetryDelay)) *> createOrder(
          request,
          subscriptionName,
          deadline,
        )
      case _ => ZIO.fail(failure)
    }

  /** https://developer.zuora.com/v1-api-reference/api/orders/post_createorderasynchronously */
  private def submit(request: CancellationOrderRequest, timeout: FiniteDuration): Task[String] =
    for {
      body <- zuoraClient.send(
        basicRequest
          .contentType("application/json")
          .body(request.toJson)
          .readTimeout(timeout)
          .post(uri"async/orders"),
      )
      submission <- ZIO.fromEither(
        ZuoraRestBody.parseIfSuccessful[AsyncJobSubmission](body, ZuoraRestBody.ZuoraSuccessCheck.SuccessCheckLowercase),
      )
      jobId <- submission match {
        case AsyncJobSubmission.Accepted(value) => ZIO.succeed(value)
        case AsyncJobSubmission.Rejected => ZIO.fail(new Throwable("Zuora did not accept the cancellation order"))
      }
    } yield jobId

  /** https://developer.zuora.com/v1-api-reference/api/orders/get_jobstatusandresponse */
  private def getJobReport(jobId: String, timeout: FiniteDuration): Task[AsyncJobReport] =
    for {
      body <- zuoraClient.send(basicRequest.readTimeout(timeout).get(uri"async-jobs/$jobId"))
      report <- ZIO.fromEither(
        ZuoraRestBody.parseIfSuccessful[AsyncJobReport](body, ZuoraRestBody.ZuoraSuccessCheck.SuccessCheckLowercase),
      )
    } yield report

  private def waitForCompletion(jobId: String, deadline: Long): Task[Unit] =
    readTimeout(deadline).flatMap { timeout =>
      getJobReport(jobId, timeout).either.flatMap {
        case Left(failure) =>
          ZIO.logWarning(s"Could not read cancellation order job $jobId: ${failure.getMessage}. Retrying.") *>
            pauseBeforeNextPoll(deadline) *> waitForCompletion(jobId, deadline)
        case Right(AsyncJobReport(AsyncJobStatus.Processing, _, _)) =>
          pauseBeforeNextPoll(deadline) *> waitForCompletion(jobId, deadline)
        case Right(AsyncJobReport(AsyncJobStatus.Failed, errors, _))
            if errors.exists(
              _.contains(ZuoraCancel.LockingContentionCode),
            ) =>
          ZIO.fail(LockingContention(s"Cancellation order job $jobId failed: ${errors.get}"))
        case Right(AsyncJobReport(AsyncJobStatus.Failed, errors, _)) =>
          ZIO.fail(new Throwable(s"Cancellation order job $jobId failed: ${errors.getOrElse("no reason returned")}"))
        case Right(AsyncJobReport(AsyncJobStatus.Completed, _, Some(AsyncOrderResult(OrderStatus.Completed)))) =>
          ZIO.unit
        case Right(AsyncJobReport(AsyncJobStatus.Completed, _, result)) =>
          ZIO.fail(
            new Throwable(
              s"Cancellation order job $jobId completed with order status ${result.map(_.status.value).getOrElse("missing")}",
            ),
          )
      }
    }

  private def pauseBeforeNextPoll(deadline: Long): Task[Unit] =
    remainingDuration(deadline).flatMap {
      case Some(remaining) =>
        ZIO.sleep(Duration.fromScala(if remaining < ZuoraCancel.PollInterval then remaining
        else ZuoraCancel.PollInterval))
      case None => ZIO.fail(new Throwable("Timed out waiting for the cancellation order"))
    }

  private def readTimeout(deadline: Long): Task[FiniteDuration] =
    remainingDuration(deadline).flatMap {
      case Some(remaining) =>
        ZIO.succeed(if remaining < ZuoraCancel.RequestReadTimeout then remaining else ZuoraCancel.RequestReadTimeout)
      case None => ZIO.fail(new Throwable("Timed out waiting for the cancellation order"))
    }

  private def remainingDuration(deadline: Long): zio.UIO[Option[FiniteDuration]] =
    Clock.nanoTime.map(now => Option.when(deadline > now)(FiniteDuration(deadline - now, NANOSECONDS)))
}

object ZuoraCancel {
  private[zuora] val PollInterval = 2.seconds
  private[zuora] val RequestReadTimeout = 2.minutes
  private[zuora] val MaximumOrderDuration = 3.minutes
  private[zuora] val PostOrderWorkBuffer = 2.minutes
  private[zuora] val MinimumOrderDuration = 10.seconds
  private[zuora] val LockingContentionRetryDelay = 1.minute
  private[zuora] val LockingContentionCode = "[40000050]"

  private[zuora] def orderDuration(remainingTime: FiniteDuration): Option[FiniteDuration] = {
    val availableDuration = remainingTime - PostOrderWorkBuffer
    Option.when(availableDuration >= MinimumOrderDuration) {
      if availableDuration < MaximumOrderDuration then availableDuration else MaximumOrderDuration
    }
  }
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

sealed trait AsyncJobSubmission

object AsyncJobSubmission {
  case class Accepted(jobId: String) extends AsyncJobSubmission
  case object Rejected extends AsyncJobSubmission

  private case class Response(success: Boolean, jobId: Option[String]) derives JsonDecoder

  given JsonDecoder[AsyncJobSubmission] = JsonDecoder[Response].mapOrFail {
    case Response(true, Some(jobId)) => Right(Accepted(jobId))
    case Response(true, None) => Left("Zuora accepted the cancellation order without returning a job ID")
    case Response(false, _) => Right(Rejected)
  }
}

case class AsyncJobReport(status: AsyncJobStatus, errors: Option[String], result: Option[AsyncOrderResult])
    derives JsonDecoder

case class AsyncOrderResult(status: OrderStatus) derives JsonDecoder

enum AsyncJobStatus(val value: String) {
  case Processing extends AsyncJobStatus("Processing")
  case Failed extends AsyncJobStatus("Failed")
  case Completed extends AsyncJobStatus("Completed")
}

object AsyncJobStatus {
  given JsonDecoder[AsyncJobStatus] = JsonDecoder[String].mapOrFail {
    case "Processing" => Right(AsyncJobStatus.Processing)
    case "Failed" => Right(AsyncJobStatus.Failed)
    case "Completed" => Right(AsyncJobStatus.Completed)
    case status => Left(s"Unknown Zuora async job status: $status")
  }
}

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

private case class LockingContention(reason: String) extends Throwable(reason)
