package com.gu.zuora

import com.gu.zuora.orders.{AsyncJobReport, AsyncJobStatus, AsyncJobSubmission, CreateOrderRequest, OrderStatus}
import com.gu.zuora.subscription.{ZuoraApiFailure, ZuoraApiResponse}
import com.typesafe.scalalogging.LazyLogging
import io.circe.generic.auto._
import sttp.client3._
import sttp.client3.circe._

import scala.annotation.tailrec
import scala.concurrent.duration.DurationInt

object ZuoraOrders extends LazyLogging {
  private val MaxPollAttempts = 150
  private val PollInterval = 2.seconds

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
  ): ZuoraApiResponse[Unit] =
    for {
      jobId <- submitOrder(config, accessToken, backend)(request)
      _ = logger.info(s"Submitted Zuora order job $jobId")
      _ <- waitForCompletion(
        jobId = jobId,
        getReport = getJobReport(config, accessToken, backend),
        pause = pause,
        maxPollAttempts = maxPollAttempts,
      )
      _ = logger.info(s"Zuora order job $jobId completed")
    } yield ()

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
  ): ZuoraApiResponse[Unit] = {
    @tailrec
    def poll(pollsRemaining: Int): ZuoraApiResponse[Unit] =
      if (pollsRemaining <= 0) {
        Left(ZuoraApiFailure(s"Timed out waiting for Zuora order job $jobId"))
      } else {
        getReport(jobId) match {
          case Left(failure) => Left(failure)
          case Right(AsyncJobReport(AsyncJobStatus.Failed, errors, _)) =>
            Left(ZuoraApiFailure(s"Zuora order job $jobId failed: ${errors.getOrElse("no reason returned")}"))
          case Right(AsyncJobReport(AsyncJobStatus.Completed, _, Some(result)))
              if result.status == OrderStatus.Completed =>
            Right(())
          case Right(AsyncJobReport(AsyncJobStatus.Completed, _, result)) =>
            val orderStatus = result.map(_.status.value).getOrElse("missing")
            Left(ZuoraApiFailure(s"Zuora order job $jobId completed with order status $orderStatus"))
          case Right(AsyncJobReport(AsyncJobStatus.Processing, _, _)) if pollsRemaining == 1 =>
            Left(ZuoraApiFailure(s"Timed out waiting for Zuora order job $jobId"))
          case Right(AsyncJobReport(AsyncJobStatus.Processing, _, _)) =>
            pause()
            poll(pollsRemaining - 1)
        }
      }

    poll(maxPollAttempts)
  }
}
