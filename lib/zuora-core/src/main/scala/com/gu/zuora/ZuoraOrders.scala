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
import io.circe.parser.decode
import sttp.client3._
import sttp.client3.circe._
import sttp.model.StatusCode

import java.util.concurrent.locks.LockSupport
import scala.annotation.tailrec
import scala.concurrent.duration.{DurationInt, FiniteDuration, NANOSECONDS}

object ZuoraOrders extends LazyLogging {
  private val PollInterval = 2.seconds
  private[gu] val MaximumOrderAttemptDuration = 5.minutes
  private val RequestReadTimeout = 2.minutes
  private val MaxOrderAttempts = 5
  private val OrderRetryDelay = 1.minute
  private val ConcurrentIdempotencyRequestCode = "50000050"

  private[gu] val MaximumOrderDuration: FiniteDuration =
    MaximumOrderAttemptDuration * MaxOrderAttempts.toLong + OrderRetryDelay * (MaxOrderAttempts - 1).toLong

  private[zuora] sealed trait OrderFailure {
    def reason: String
  }

  // The order definitely failed, so the current idempotency key is not reusable.
  private case class ConfirmedOrderFailure(reason: String) extends OrderFailure

  // The next Lambda run should retry the same deterministic idempotency key.
  private case class RetryIdempotencyKeyLater(reason: String) extends OrderFailure
  private case class ZuoraErrorReason(code: String)
  private case class ZuoraErrorResponse(reasons: List[ZuoraErrorReason])

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
          .toRight(RetryIdempotencyKeyLater("Timed out before submitting the Zuora order"))
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
          attempt(attemptsRemaining - 1) // this idempotency key is not reusable, try the next one
        case other => other // the next Lambda run will retry with the same deterministic idempotency keys
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
      attemptIdempotencyKey: String,
  )(
      request: CreateOrderRequest,
  ): Either[OrderFailure, String] =
    basicRequest
      .post(uri"${config.baseUrl}/async/orders")
      .header("Authorization", s"Bearer ${accessToken.access_token}")
      .header("Idempotency-Key", attemptIdempotencyKey)
      .readTimeout(readTimeout)
      .body(request)
      .response(asJson[AsyncJobSubmission])
      .send(backend)
      .body
      .left
      .map {
        case HttpError(body: String, StatusCode.Conflict) if isConcurrentIdempotencyRequest(body) =>
          RetryIdempotencyKeyLater("Zuora is already processing a request with this idempotency key")
        case error: HttpError[_] =>
          ConfirmedOrderFailure(s"Failed to submit Zuora order: ${error.toString}")
        case error =>
          logger.error("Failed to decode the Zuora order submission response", error)
          RetryIdempotencyKeyLater(s"Failed to submit Zuora order: ${error.toString}")
      }
      .flatMap {
        case AsyncJobSubmission.Accepted(jobId) => Right(jobId)
        case AsyncJobSubmission.Rejected => Left(ConfirmedOrderFailure("Zuora did not accept the order"))
      }

  private def isConcurrentIdempotencyRequest(body: String): Boolean =
    decode[ZuoraErrorResponse](body).toOption.exists(
      _.reasons.exists(_.code == ConcurrentIdempotencyRequestCode),
    )

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
    val timedOut = Left(RetryIdempotencyKeyLater(s"Timed out waiting for Zuora order job $jobId"))

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
            case Right(
                  AsyncJobReport(
                    AsyncJobStatus.Completed,
                    _,
                    Some(result @ AsyncOrderResult(OrderStatus.Failed | OrderStatus.Cancelled)),
                  ),
                ) =>
              Left(
                ConfirmedOrderFailure(
                  s"Zuora order job $jobId was unsuccessful - final status ${result.status.value}",
                ),
              )
            case Right(AsyncJobReport(AsyncJobStatus.Completed, _, result)) =>
              val orderStatus = result.map(_.status.value).getOrElse("missing")
              Left(
                RetryIdempotencyKeyLater(
                  s"Zuora order job $jobId completed without a successful order result: $orderStatus",
                ),
              )
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
