package com.gu.productmove.zuora

import com.gu.productmove.zuora.model.{AccountNumber, SubscriptionName}
import com.gu.productmove.zuora.rest.ZuoraClient
import sttp.client3.Request
import zio.*
import zio.test.*

import java.time.LocalDate
import scala.concurrent.duration.Duration as ScalaDuration

object ZuoraCancelSpec extends ZIOSpecDefault {
  override def spec: Spec[TestEnvironment & Scope, Any] =
    suite("ZuoraCancel")(
      test("submits a synchronous Order") {
        for {
          client <- SequencedZuoraClient.make(
            List(
              Right("""{"success":true,"status":"Completed"}"""),
            ),
          )
          _ <- cancel(client)
          paths <- client.paths
          timeouts <- client.readTimeouts
        } yield assertTrue(
          paths == List("orders"),
          timeouts == List(ZuoraCancel.MaximumOrderRequestDuration),
        )
      },
      test("does not treat a pending Order as success") {
        for {
          client <- SequencedZuoraClient.make(
            List(
              Right("""{"success":true,"status":"Pending"}"""),
            ),
          )
          result <- cancel(client).either
          paths <- client.paths
        } yield assertTrue(result.isLeft, paths == List("orders"))
      },
      test("does not resubmit an Order when submission fails") {
        for {
          client <- SequencedZuoraClient.make(List(Left(new RuntimeException("connection reset"))))
          result <- cancel(client).either
          paths <- client.paths
        } yield assertTrue(result.isLeft, paths == List("orders"))
      },
    )

  private def cancel(client: ZuoraClient): Task[Unit] =
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

  private final class SequencedZuoraClient(
      responses: Ref[List[Either[Throwable, String]]],
      requestPaths: Ref[List[String]],
      requestReadTimeouts: Ref[List[ScalaDuration]],
  ) extends ZuoraClient {
    override def send(request: Request[Either[String, String], Any]): Task[String] =
      requestPaths.update(_ :+ request.uri.toString) *>
        requestReadTimeouts.update(_ :+ request.options.readTimeout) *>
        responses
          .modify {
            case response :: remaining => (response, remaining)
            case Nil => (Left(new RuntimeException("No Zuora response was configured")), Nil)
          }
          .flatMap(ZIO.fromEither)

    def paths: UIO[List[String]] = requestPaths.get
    def readTimeouts: UIO[List[ScalaDuration]] = requestReadTimeouts.get
  }

  private object SequencedZuoraClient {
    def make(responses: List[Either[Throwable, String]]): UIO[SequencedZuoraClient] =
      for {
        responseQueue <- Ref.make(responses)
        requestPaths <- Ref.make(List.empty[String])
        requestReadTimeouts <- Ref.make(List.empty[ScalaDuration])
      } yield new SequencedZuoraClient(responseQueue, requestPaths, requestReadTimeouts)
  }
}
