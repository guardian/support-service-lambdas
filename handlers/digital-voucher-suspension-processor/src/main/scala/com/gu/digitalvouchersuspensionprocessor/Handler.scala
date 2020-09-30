package com.gu.digitalvouchersuspensionprocessor

import cats.arrow.FunctionK
import cats.data.EitherT
import cats.effect.IO
import cats.implicits._
import com.amazonaws.services.lambda.runtime.{Context, RequestHandler}
import com.softwaremill.sttp.impl.cats.implicits._
import com.softwaremill.sttp.{HttpURLConnectionBackend, Id, SttpBackend}
import com.typesafe.scalalogging.LazyLogging

object Handler extends RequestHandler[Map[String, String], String] with LazyLogging {

  def handleRequest(input: Map[String, String], context: Context): String =
    fetchSuspensionsToBeProcessed()

  def main(args: Array[String]): Unit = println(fetchSuspensionsToBeProcessed())

  def fetchSuspensionsToBeProcessed(): String = {
    val fetch = for {
      config <- EitherT.fromEither[IO](Config.fromEnv())
      suspensions <- Salesforce.fetchSuspensions(config.salesforce, sttpBackend).leftWiden[Failure].map(_.records)
    } yield suspensions
    val suspensions = fetch.value.unsafeRunSync().valueOr { e =>
      logger.error(s"Fetching suspensions from Salesforce failed: $e")
      throw new RuntimeException(e.toString)
    }
    suspensions.foreach(suspension =>
      logger.info(s"Suspension to be processed: ${suspension.toString}"))
    suspensions.toString
  }

  // This is stolen from the digital-voucher-cancellation-processor - can be improved when STTP upgraded to v2
  val sttpBackend: SttpBackend[IO, Nothing] =
    sttpBackendToCatsMappableSttpBackend[Id, Nothing](HttpURLConnectionBackend())
      .mapK(FunctionK.lift[Id, IO](IO.delay))
}
