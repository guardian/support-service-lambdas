package com.gu.holidaystopprocessor

import cats.syntax.all._
import com.amazonaws.services.lambda.runtime.{Context, LambdaRuntime}
import com.gu.creditprocessor.ProcessResult
import com.gu.effects.GetFromS3
import com.gu.holiday_stops.{Configuration, ConfigurationLive}
import com.gu.holidaystopprocessor.HolidayStopCreditProcessor.{ProductTypeAndStopDate, processAllProducts}
import com.gu.zuora.ZuoraProductTypes.ZuoraProductType
import io.circe.generic.auto._
import io.github.mkotsur.aws.handler.Lambda
import io.github.mkotsur.aws.handler.Lambda._
import sttp.client3.HttpURLConnectionBackend
import zio._
import zio.console.Console

import java.io.{IOException, OutputStream, PrintStream}
import java.lang.{System => JavaSystem}
import java.time.LocalDate

object Handler extends Lambda[Option[ProductTypeAndStopDate], List[ZuoraHolidayCreditAddResult]] with zio.App {

  val printStream = new PrintStream(new OutputStream() {
    override def write(b: Int): Unit =
      LambdaRuntime.getLogger.log(Array(b.toByte))

    override def write(b: Array[Byte]): Unit =
      LambdaRuntime.getLogger.log(b)

    override def write(b: Array[Byte], off: Int, len: Int): Unit =
      LambdaRuntime.getLogger.log(b.slice(off, off + len))
  })

  /** @param productTypeAndStopDateOverride
    *   Optionally, the handler will take a product type and stopped publication date of holiday-stop requests to
    *   process. This is to facilitate testing. In normal use it will be missing and all product types will be processed
    *   for publication dates determined by the fulfilment dates file.
    */
  override def handle(
      productTypeAndStopDateOverride: Option[ProductTypeAndStopDate],
      context: Context,
  ): Either[Throwable, List[ZuoraHolidayCreditAddResult]] = {
    JavaSystem.setOut(printStream)
    JavaSystem.setErr(printStream)

    val runtime = zio.Runtime.default

    val main: RIO[Console with Configuration, List[ZuoraHolidayCreditAddResult]] =
      for {
        config <- Configuration.config
        results <- RIO.effect(
          HolidayStopCreditProcessor.processAllProducts(
            config,
            productTypeAndStopDateOverride,
            HttpURLConnectionBackend(),
            GetFromS3.fetchString,
          ),
        )
        _ <- RIO.effect(ProcessResult.log(results))
        zuoraWriteResults <- results.flatMap(_.overallFailure.toList) match {
          case Nil =>
            val (_, successfulZuoraResponses) = results.flatMap(_.creditResults).separate
            RIO.succeed(successfulZuoraResponses)
          case failures =>
            RIO.fail(new RuntimeException(failures.map(_.reason).mkString("; ")))
        }
      } yield zuoraWriteResults

    runtime.unsafeRun {
      main.provideCustomLayer(ConfigurationLive.impl).either
    }
  }

  // This is just for functional testing locally.
  def run(args: List[String]): URIO[ZEnv, ExitCode] = {

    def showResults(processResults: List[ProcessResult[ZuoraHolidayCreditAddResult]]): ZIO[Console, IOException, Unit] =
      for {
        _ <- console.putStrLn(processResults.flatMap(_.creditsToApply).size.toString)
        _ <- ZIO.foreach_(processResults.flatMap(_.overallFailure)) { failure =>
          console.putStrLn(s"Overall failure: ${failure.reason}")
        }
        _ <- ZIO.foreach_(processResults.flatMap(_.creditResults)) {
          case Left(failure) => console.putStrLn(s"Failed: ${failure.reason}")
          case Right(response) => console.putStrLn(s"Success: $response")
        }
      } yield ()

    def main(productTypeAndStopDate: Option[ProductTypeAndStopDate]) =
      for {
        config <- Configuration.config
        processResults <- ZIO.effect(
          processAllProducts(
            config,
            productTypeAndStopDate,
            HttpURLConnectionBackend(),
            GetFromS3.fetchString,
          ),
        )
        _ <- showResults(processResults)
      } yield ()

    val productTypeAndStopDate = for {
      productType <- args.headOption.map(arg => ZuoraProductType(arg))
      stopDate <- args.lift(1).map(LocalDate.parse)
    } yield ProductTypeAndStopDate(productType, stopDate)
    val program = main(productTypeAndStopDate).provideCustomLayer(ConfigurationLive.impl)
    program.exitCode
  }
}
