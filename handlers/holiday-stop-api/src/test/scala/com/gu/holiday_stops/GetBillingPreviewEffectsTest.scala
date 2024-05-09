package com.gu.holiday_stops

import cats.Id
import com.gu.holiday_stops.Handler.{getAccessTokenFromZuora, getBillingPreviewFromZuora}
import com.gu.test.EffectsTest
import org.scalatest.flatspec.AnyFlatSpec
import org.scalatest.matchers.should.Matchers
import sttp.client3.HttpURLConnectionBackend
import sttp.client3.logging.{LogLevel, Logger, LoggingBackend}

import java.time.LocalDate

class GetBillingPreviewEffectsTest extends AnyFlatSpec with Matchers {

  lazy val config = {
    zio.Runtime.default.unsafeRun {
      Configuration.config.provideLayer(ConfigurationLive.impl)
    }
  }

  lazy val backend = LoggingBackend(
    HttpURLConnectionBackend(),
    new Logger[Id] {
      override def apply(level: LogLevel, message: => String): Id[Unit] = info("LOG: " + message)

      override def apply(level: LogLevel, message: => String, t: Throwable): Id[Unit] =
        info("LOG: " + message + t.toString)
    },
    logResponseBody = true,
  )

  "get billing preview" should "fetch a test subscription's preview" taggedAs EffectsTest ignore {

    val ACCOUNT_TO_USE = "A00211577"

    val op = getBillingPreviewFromZuora(config, backend)
    val accessToken = getAccessTokenFromZuora(config, backend).toOption.get

    val preview = op.getBillingPreview(accessToken, ACCOUNT_TO_USE, LocalDate.now.plusMonths(13))
    info("preview is: " + preview)
    preview.toOption.get.length shouldBe 26
  }
}
