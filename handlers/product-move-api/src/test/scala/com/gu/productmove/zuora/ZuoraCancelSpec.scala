package com.gu.productmove.zuora

import com.gu.productmove.zuora.model.{AccountNumber, SubscriptionName}
import com.gu.productmove.zuora.rest.ZuoraClient
import com.gu.productmove.framework.LambdaRemainingTime
import sttp.client3.Request
import zio.*
import zio.test.*

import java.time.LocalDate

object ZuoraCancelSpec extends ZIOSpecDefault {
  override def spec: Spec[TestEnvironment & Scope, Any] =
    suite("ZuoraCancel")(
      test("waits for both the job and its Order to complete") {
        for {
          client <- SequencedZuoraClient.make(
            List(
              Right("""{"success":true,"jobId":"job-123"}"""),
              Right("""{"success":true,"status":"Completed","errors":null,"result":{"status":"Completed"}}"""),
            ),
          )
          _ <- cancel(client)
          paths <- client.paths
        } yield assertTrue(paths == List("async/orders", "async-jobs/job-123"))
      },
      test("does not treat a completed job with a pending Order as success") {
        for {
          client <- SequencedZuoraClient.make(
            List(
              Right("""{"success":true,"jobId":"job-123"}"""),
              Right("""{"success":true,"status":"Completed","errors":null,"result":{"status":"Pending"}}"""),
            ),
          )
          result <- cancel(client).either
          paths <- client.paths
        } yield assertTrue(result.isLeft, paths == List("async/orders", "async-jobs/job-123"))
      },
      test("does not resubmit an Order when submission fails") {
        for {
          client <- SequencedZuoraClient.make(List(Left(new RuntimeException("connection reset"))))
          result <- cancel(client).either
          paths <- client.paths
        } yield assertTrue(result.isLeft, paths == List("async/orders"))
      },
      test("does not submit an Order when the Lambda needs its remaining time for later work") {
        for {
          client <- SequencedZuoraClient.make(Nil)
          result <- cancel(client, remainingTimeInMillis = 10000).either
          paths <- client.paths
        } yield assertTrue(result.isLeft, paths.isEmpty)
      },
      test("retries a temporary job status read without resubmitting the Order") {
        for {
          client <- SequencedZuoraClient.make(
            List(
              Right("""{"success":true,"jobId":"job-123"}"""),
              Left(new RuntimeException("temporary network error")),
              Right("""{"success":true,"status":"Completed","errors":null,"result":{"status":"Completed"}}"""),
            ),
          )
          fiber <- cancel(client).fork
          _ <- TestClock.adjust(Duration.fromSeconds(2))
          _ <- fiber.join
          paths <- client.paths
        } yield assertTrue(paths == List("async/orders", "async-jobs/job-123", "async-jobs/job-123"))
      },
      test("retries one Order after Zuora confirms locking contention") {
        for {
          client <- SequencedZuoraClient.make(
            List(
              Right("""{"success":true,"jobId":"job-123"}"""),
              Right(
                """{"success":true,"status":"Failed","errors":"[40000050] Operation failed due to a lock competition","result":null}""",
              ),
              Right("""{"success":true,"jobId":"job-456"}"""),
              Right("""{"success":true,"status":"Completed","errors":null,"result":{"status":"Completed"}}"""),
            ),
          )
          fiber <- cancel(client).fork
          _ <- TestClock.adjust(Duration.fromSeconds(60))
          _ <- fiber.join
          paths <- client.paths
        } yield assertTrue(
          paths == List("async/orders", "async-jobs/job-123", "async/orders", "async-jobs/job-456"),
        )
      },
      test("polls a processing job until both statuses complete") {
        for {
          client <- SequencedZuoraClient.make(
            List(
              Right("""{"success":true,"jobId":"job-123"}"""),
              Right("""{"success":true,"status":"Processing","errors":null,"result":null}"""),
              Right("""{"success":true,"status":"Completed","errors":null,"result":{"status":"Completed"}}"""),
            ),
          )
          fiber <- cancel(client).fork
          _ <- TestClock.adjust(Duration.fromSeconds(2))
          _ <- fiber.join
          paths <- client.paths
        } yield assertTrue(paths == List("async/orders", "async-jobs/job-123", "async-jobs/job-123"))
      },
    )

  private def cancel(client: ZuoraClient, remainingTimeInMillis: Int = 300000): Task[Unit] =
    LambdaRemainingTime.withRemainingTime(() => remainingTimeInMillis) {
      ZIO
        .serviceWithZIO[ZuoraCancel](
          _.cancel(
            AccountNumber("A0123456"),
            SubscriptionName("A-S0123456"),
            LocalDate.of(2026, 9, 1),
            LocalDate.of(2026, 8, 19),
          ),
        )
        .provide(ZuoraCancelLive.layer, ZLayer.succeed(client))
    }

  private final class SequencedZuoraClient(
      responses: Ref[List[Either[Throwable, String]]],
      requestPaths: Ref[List[String]],
  ) extends ZuoraClient {
    override def send(request: Request[Either[String, String], Any]): Task[String] =
      requestPaths.update(_ :+ request.uri.toString) *>
        responses
          .modify {
            case response :: remaining => (response, remaining)
            case Nil => (Left(new RuntimeException("No Zuora response was configured")), Nil)
          }
          .flatMap(ZIO.fromEither)

    def paths: UIO[List[String]] = requestPaths.get
  }

  private object SequencedZuoraClient {
    def make(responses: List[Either[Throwable, String]]): UIO[SequencedZuoraClient] =
      for {
        responseQueue <- Ref.make(responses)
        requestPaths <- Ref.make(List.empty[String])
      } yield new SequencedZuoraClient(responseQueue, requestPaths)
  }
}
