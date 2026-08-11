package com.gu.zuora

import com.gu.zuora.orders.{AsyncJobReport, AsyncJobStatus, AsyncJobSubmission, CreateOrderRequest, OrderStatus}
import com.gu.zuora.subscription.{ZuoraApiFailure, ZuoraApiResponse}
import com.typesafe.scalalogging.LazyLogging
import io.circe.generic.auto._
import sttp.client3._
import sttp.client3.circe._

import scala.annotation.tailrec
import scala.concurrent.duration.{DurationInt, FiniteDuration}

object ZuoraOrders extends LazyLogging {
  private val PollInterval = 2.seconds
  private val MaxPollingDuration = 5.minutes
  private val MaxPollAttempts = (MaxPollingDuration / PollInterval).toInt
  private val MaxOrderAttempts = 2
  private val LockingContentionCode = "[40000050]"

  private[gu] val MaximumOrderDuration: FiniteDuration =
    FiniteDuration(MaxPollingDuration.length * MaxOrderAttempts.toLong, MaxPollingDuration.unit)

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
      pause = () => Thread.sleep(PollInterval.toMillis),
      maxPollAttempts = MaxPollAttempts,
    )(request)

  private[zuora] def createOrderAsynchronously(
      config: ZuoraConfig,
      accessToken: AccessToken,
      backend: SttpBackend[Identity, Any],
      pause: () => Unit,
      maxPollAttempts: Int,
  )(
      request: CreateOrderRequest,
  ): ZuoraApiResponse[Unit] = {
    @tailrec
    def attempt(attemptsRemaining: Int): Either[OrderFailure, Unit] = {
      val result = for {
        jobId <- submitOrder(config, accessToken, backend)(request).left.map(failure =>
          PermanentOrderFailure(failure.reason),
        )
        _ = logger.info(s"Submitted Zuora order job $jobId")
        _ <- waitForCompletion(
          jobId = jobId,
          getReport = getJobReport(config, accessToken, backend),
          pause = pause,
          maxPollAttempts = maxPollAttempts,
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
  )(
      request: CreateOrderRequest,
  ): ZuoraApiResponse[String] =
    basicRequest
      .post(uri"${config.baseUrl}/async/orders")
      .header("Authorization", s"Bearer ${accessToken.access_token}")
      .body(request)
      .response(asJson[AsyncJobSubmission])
      .mapResponse(_.left.map(error => ZuoraApiFailure(s"Failed to submit Zuora order: ${error.getMessage}")))
      .send(backend)
      .body
      .flatMap {
        case AsyncJobSubmission(Some(jobId), true) => Right(jobId)
        case AsyncJobSubmission(None, true) =>
          Left(ZuoraApiFailure("Zuora accepted the order without returning a job ID"))
        case AsyncJobSubmission(_, false) => Left(ZuoraApiFailure("Zuora did not accept the order"))
      }

  /** https://developer.zuora.com/v1-api-reference/api/orders/get_jobstatusandresponse */
  private def getJobReport(
      config: ZuoraConfig,
      accessToken: AccessToken,
      backend: SttpBackend[Identity, Any],
  )(
      jobId: String,
  ): ZuoraApiResponse[AsyncJobReport] =
    basicRequest
      .get(uri"${config.baseUrl}/async-jobs/$jobId")
      .header("Authorization", s"Bearer ${accessToken.access_token}")
      .response(asJson[AsyncJobReport])
      .mapResponse(_.left.map(error => ZuoraApiFailure(s"Failed to read Zuora order job $jobId: ${error.getMessage}")))
      .send(backend)
      .body

  private[zuora] def waitForCompletion(
      jobId: String,
      getReport: String => ZuoraApiResponse[AsyncJobReport],
      pause: () => Unit,
      maxPollAttempts: Int,
  ): Either[OrderFailure, Unit] = {
    require(maxPollAttempts > 0, "maxPollAttempts must be positive")

    @tailrec
    def poll(pollsRemaining: Int): Either[OrderFailure, Unit] =
      getReport(jobId) match {
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
        case Right(AsyncJobReport(AsyncJobStatus.Processing, _, _)) if pollsRemaining == 1 =>
          Left(PermanentOrderFailure(s"Timed out waiting for Zuora order job $jobId"))
        case Right(AsyncJobReport(AsyncJobStatus.Processing, _, _)) =>
          pause()
          poll(pollsRemaining - 1)
      }

    poll(maxPollAttempts)
  }
}
