package com.gu.zuora

import com.gu.zuora.orders.{AsyncJobReport, AsyncJobStatus, AsyncJobSubmission, CreateOrderRequest, OrderStatus}
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
  private val MaxOrderDuration = 5.minutes
  private val RequestReadTimeout = 2.minutes
  private val MaxOrderAttempts = 2
  private val LockingContentionCode = "[40000050]"

  private[gu] val MaximumOrderDuration: FiniteDuration =
    MaxOrderDuration * MaxOrderAttempts.toLong

  private[zuora] sealed trait OrderFailure {
    def reason: String
  }

  private case class LockingContention(reason: String) extends OrderFailure
  private case class PermanentOrderFailure(reason: String) extends OrderFailure

  def createOrderAsynchronously(
      config: ZuoraConfig,
      accessToken: AccessToken,
      backend: SttpBackend[Identity, Any],
  )(
      request: CreateOrderRequest,
  ): ZuoraApiResponse[Unit] =
    createOrderAsynchronously(
      config,
      accessToken,
      backend,
      pause = duration => LockSupport.parkNanos(duration.toNanos),
      monotonicNanos = () => System.nanoTime(),
      maxOrderDuration = MaxOrderDuration,
    )(request)

  private[zuora] def createOrderAsynchronously(
      config: ZuoraConfig,
      accessToken: AccessToken,
      backend: SttpBackend[Identity, Any],
      pause: FiniteDuration => Unit,
      monotonicNanos: () => Long,
      maxOrderDuration: FiniteDuration,
  )(
      request: CreateOrderRequest,
  ): ZuoraApiResponse[Unit] = {
    require(maxOrderDuration.length > 0, "maxOrderDuration must be positive")

    @tailrec
    def attempt(attemptsRemaining: Int): Either[OrderFailure, Unit] = {
      val deadlineNanos = monotonicNanos() + maxOrderDuration.toNanos
      val result = for {
        readTimeout <- remainingReadTimeout(deadlineNanos, monotonicNanos)
          .toRight(PermanentOrderFailure("Timed out before submitting the Zuora order"))
        jobId <- submitOrder(config, accessToken, backend, readTimeout)(request).left
          .map(failure => PermanentOrderFailure(failure.reason))
        _ = logger.info(s"Submitted Zuora order job $jobId")
        _ <- waitForCompletion(
          jobId = jobId,
          getReport = getJobReport(config, accessToken, backend),
          pause = pause,
          deadlineNanos = deadlineNanos,
          monotonicNanos = monotonicNanos,
        )
        _ = logger.info(s"Zuora order job $jobId completed")
      } yield ()

      result match {
        case Left(failure: LockingContention) if attemptsRemaining > 1 =>
          logger.warn(s"Retrying the Zuora order after locking contention: ${failure.reason}")
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
  )(
      request: CreateOrderRequest,
  ): ZuoraApiResponse[String] =
    basicRequest
      .post(uri"${config.baseUrl}/async/orders")
      .header("Authorization", s"Bearer ${accessToken.access_token}")
      .readTimeout(readTimeout)
      .body(request)
      .response(asJson[AsyncJobSubmission])
      .mapResponse(_.left.map(error => ZuoraApiFailure(s"Failed to submit Zuora order: ${error.getMessage}")))
      .send(backend)
      .body
      .flatMap {
        case AsyncJobSubmission.Accepted(jobId) => Right(jobId)
        case AsyncJobSubmission.Rejected => Left(ZuoraApiFailure("Zuora did not accept the order"))
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
  ): Either[OrderFailure, Unit] = {
    val timedOut = Left(PermanentOrderFailure(s"Timed out waiting for Zuora order job $jobId"))

    @tailrec
    def poll(): Either[OrderFailure, Unit] =
      remainingReadTimeout(deadlineNanos, monotonicNanos) match {
        case None => timedOut
        case Some(readTimeout) =>
          val report = getReport(jobId, readTimeout)
          if (remainingDuration(deadlineNanos, monotonicNanos).isEmpty) timedOut
          else
            report match {
              case Left(failure) => Left(PermanentOrderFailure(failure.reason))
              case Right(AsyncJobReport(AsyncJobStatus.Failed, errors, _)) =>
                val reason = s"Zuora order job $jobId failed: ${errors.getOrElse("no reason returned")}"
                if (errors.exists(_.contains(LockingContentionCode))) Left(LockingContention(reason))
                else Left(PermanentOrderFailure(reason))
              case Right(AsyncJobReport(AsyncJobStatus.Completed, _, Some(result)))
                  if result.status == OrderStatus.Completed =>
                Right(())
              case Right(AsyncJobReport(AsyncJobStatus.Completed, _, result)) =>
                val orderStatus = result.map(_.status.value).getOrElse("missing")
                Left(PermanentOrderFailure(s"Zuora order job $jobId completed with order status $orderStatus"))
              case Right(AsyncJobReport(AsyncJobStatus.Processing, _, _)) =>
                remainingDuration(deadlineNanos, monotonicNanos) match {
                  case None => timedOut
                  case Some(timeRemaining) =>
                    pause(if (timeRemaining < PollInterval) timeRemaining else PollInterval)
                    poll()
                }
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
