package com.gu.zuora

import com.gu.zuora.orders.{
  AsyncJobReport,
  AsyncJobStatus,
  AsyncJobSubmission,
  AsyncOrderResult,
  CreateOrderRequest,
  OrderStatus,
}
import com.gu.zuora.subscription.{ZuoraApiFailure, ZuoraApiResponse}
import com.typesafe.scalalogging.LazyLogging
import io.circe.generic.auto._
import sttp.client3._
import sttp.client3.circe._

import java.util.concurrent.locks.LockSupport
import scala.annotation.tailrec
import scala.concurrent.duration.{DurationInt, FiniteDuration, NANOSECONDS}

object ZuoraOrders extends LazyLogging {
  private val PollInterval = 2.seconds
  private[gu] val MaximumOrderAttemptDuration = 5.minutes
  private val RequestReadTimeout = 2.minutes
  private val MaxOrderAttempts = 5
  private val OrderRetryDelay = 1.minute

  private[gu] val MaximumOrderDuration: FiniteDuration =
    MaximumOrderAttemptDuration * MaxOrderAttempts.toLong + OrderRetryDelay * (MaxOrderAttempts - 1).toLong

  private[zuora] sealed trait OrderFailure {
    def reason: String
  }

  private case class ConfirmedOrderFailure(reason: String) extends OrderFailure
  private case class UnknownOrderOutcome(reason: String) extends OrderFailure

  def createOrderAsynchronously(
      config: ZuoraConfig,
      accessToken: AccessToken,
      backend: SttpBackend[Identity, Any],
      maximumOrderDuration: FiniteDuration,
      maximumOrderAttemptDuration: FiniteDuration,
      idempotencyKey: String,
  )(
      request: CreateOrderRequest,
  ): ZuoraApiResponse[AsyncOrderResult] =
    createOrderAsynchronously(
      config,
      accessToken,
      backend,
      pause = duration => LockSupport.parkNanos(duration.toNanos),
      monotonicNanos = () => System.nanoTime(),
      maximumOrderDuration = maximumOrderDuration,
      maximumOrderAttemptDuration = maximumOrderAttemptDuration,
      idempotencyKey = idempotencyKey,
    )(request)

  private[zuora] def createOrderAsynchronously(
      config: ZuoraConfig,
      accessToken: AccessToken,
      backend: SttpBackend[Identity, Any],
      pause: FiniteDuration => Unit,
      monotonicNanos: () => Long,
      maximumOrderDuration: FiniteDuration,
      maximumOrderAttemptDuration: FiniteDuration,
      idempotencyKey: String,
  )(
      request: CreateOrderRequest,
  ): ZuoraApiResponse[AsyncOrderResult] = {
    require(maximumOrderDuration.length > 0, "maximumOrderDuration must be positive")
    require(maximumOrderAttemptDuration.length > 0, "maximumOrderAttemptDuration must be positive")

    val orderDeadlineNanos = monotonicNanos() + maximumOrderDuration.toNanos

    @tailrec
    def attempt(attemptsRemaining: Int): Either[OrderFailure, AsyncOrderResult] = {
      val attemptNumber = MaxOrderAttempts - attemptsRemaining + 1
      val attemptIdempotencyKey =
        if (attemptNumber == 1) idempotencyKey else s"$idempotencyKey-$attemptNumber"
      val attemptDeadlineNanos = math.min(orderDeadlineNanos, monotonicNanos() + maximumOrderAttemptDuration.toNanos)
      val result = for {
        readTimeout <- remainingReadTimeout(attemptDeadlineNanos, monotonicNanos)
          .toRight(UnknownOrderOutcome("Timed out before submitting the Zuora order"))
        jobId <- submitOrder(config, accessToken, backend, readTimeout, attemptIdempotencyKey)(request)
        _ = logger.info(s"Submitted Zuora order job $jobId")
        result <- waitForCompletion(
          jobId = jobId,
          getReport = getJobReport(config, accessToken, backend),
          pause = pause,
          deadlineNanos = attemptDeadlineNanos,
          monotonicNanos = monotonicNanos,
        )
        _ = logger.info(s"Zuora order job $jobId completed")
      } yield result

      result match {
        case Left(failure: ConfirmedOrderFailure)
            if attemptsRemaining > 1 && remainingDuration(orderDeadlineNanos, monotonicNanos).exists(
              _ > OrderRetryDelay,
            ) =>
          logger.warn(
            s"Retrying the Zuora order in $OrderRetryDelay after a confirmed failure: ${failure.reason}",
          )
          pause(OrderRetryDelay)
          attempt(attemptsRemaining - 1)
        case other => other
      }
    }

    attempt(MaxOrderAttempts).left.map(failure => ZuoraApiFailure(failure.reason))
  }

  /** https://developer.zuora.com/v1-api-reference/api/orders/post_createorderasynchronously */
  private def submitOrder(
      config: ZuoraConfig,
      accessToken: AccessToken,
      backend: SttpBackend[Identity, Any],
      readTimeout: FiniteDuration,
      idempotencyKey: String,
  )(
      request: CreateOrderRequest,
  ): Either[OrderFailure, String] =
    basicRequest
      .post(uri"${config.baseUrl}/async/orders")
      .header("Authorization", s"Bearer ${accessToken.access_token}")
      .header("Idempotency-Key", idempotencyKey)
      .readTimeout(readTimeout)
      .body(request)
      .response(asJson[AsyncJobSubmission])
      .send(backend)
      .body
      .left
      .map {
        case error: HttpError[_] =>
          ConfirmedOrderFailure(s"Failed to submit Zuora order: ${error.getMessage}")
        case error =>
          UnknownOrderOutcome(s"Failed to submit Zuora order: ${error.getMessage}")
      }
      .flatMap {
        case AsyncJobSubmission.Accepted(jobId) => Right(jobId)
        case AsyncJobSubmission.Rejected => Left(ConfirmedOrderFailure("Zuora did not accept the order"))
      }

  /** https://developer.zuora.com/v1-api-reference/api/orders/get_jobstatusandresponse */
  private def getJobReport(
      config: ZuoraConfig,
      accessToken: AccessToken,
      backend: SttpBackend[Identity, Any],
  )(
      jobId: String,
      readTimeout: FiniteDuration,
  ): ZuoraApiResponse[AsyncJobReport] =
    basicRequest
      .get(uri"${config.baseUrl}/async-jobs/$jobId")
      .header("Authorization", s"Bearer ${accessToken.access_token}")
      .readTimeout(readTimeout)
      .response(asJson[AsyncJobReport])
      .mapResponse(_.left.map(error => ZuoraApiFailure(s"Failed to read Zuora order job $jobId: ${error.getMessage}")))
      .send(backend)
      .body

  private[zuora] def waitForCompletion(
      jobId: String,
      getReport: (String, FiniteDuration) => ZuoraApiResponse[AsyncJobReport],
      pause: FiniteDuration => Unit,
      deadlineNanos: Long,
      monotonicNanos: () => Long,
  ): Either[OrderFailure, AsyncOrderResult] = {
    val timedOut = Left(UnknownOrderOutcome(s"Timed out waiting for Zuora order job $jobId"))

    def pauseForNextPoll(): Boolean =
      remainingDuration(deadlineNanos, monotonicNanos) match {
        case None => false
        case Some(timeRemaining) =>
          pause(if (timeRemaining < PollInterval) timeRemaining else PollInterval)
          true
      }

    @tailrec
    def poll(): Either[OrderFailure, AsyncOrderResult] =
      remainingReadTimeout(deadlineNanos, monotonicNanos) match {
        case None => timedOut
        case Some(readTimeout) =>
          getReport(jobId, readTimeout) match {
            case Left(failure) =>
              logger.warn(s"Could not read Zuora order job $jobId: ${failure.reason}. Retrying.")
              if (pauseForNextPoll()) poll() else timedOut
            case Right(AsyncJobReport(AsyncJobStatus.Failed, errors, _)) =>
              val reason = s"Zuora order job $jobId failed: ${errors.getOrElse("no reason returned")}"
              Left(ConfirmedOrderFailure(reason))
            case Right(AsyncJobReport(AsyncJobStatus.Completed, _, Some(result)))
                if result.status == OrderStatus.Completed =>
              Right(result)
            case Right(AsyncJobReport(AsyncJobStatus.Completed, _, result)) =>
              val orderStatus = result.map(_.status.value).getOrElse("missing")
              Left(UnknownOrderOutcome(s"Zuora order job $jobId completed with order status $orderStatus"))
            case Right(AsyncJobReport(AsyncJobStatus.Processing, _, _)) =>
              if (pauseForNextPoll()) poll() else timedOut
          }
      }

    poll()
  }

  private def remainingReadTimeout(
      deadlineNanos: Long,
      monotonicNanos: () => Long,
  ): Option[FiniteDuration] =
    remainingDuration(deadlineNanos, monotonicNanos).map { timeRemaining =>
      if (timeRemaining < RequestReadTimeout) timeRemaining else RequestReadTimeout
    }

  private def remainingDuration(
      deadlineNanos: Long,
      monotonicNanos: () => Long,
  ): Option[FiniteDuration] = {
    val remainingNanos = deadlineNanos - monotonicNanos()
    Option.when(remainingNanos > 0)(FiniteDuration(remainingNanos, NANOSECONDS))
  }
}
