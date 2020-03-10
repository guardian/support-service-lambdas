package com.gu.sf.move.subscriptions.api

import cats.data.EitherT
import cats.effect.{ContextShift, IO, Sync}
import cats.implicits._
import com.gu.conf.{ResourceConfigurationLocation, SSMConfigurationLocation}
import com.gu.{AppIdentity, AwsIdentity, DevIdentity}
import com.typesafe.config.Config
import com.typesafe.scalalogging.LazyLogging
import org.http4s.HttpRoutes
import org.http4s.server.middleware.Logger
import org.http4s.util.CaseInsensitiveString

object SFMoveSubscriptionsApiApp extends LazyLogging {

  private implicit val cs: ContextShift[IO] = IO.contextShift(scala.concurrent.ExecutionContext.global)

  def apply(appIdentity: AppIdentity): EitherT[IO, MoveSubscriptionApiError, HttpRoutes[IO]] = {
    for {
      apiConfig <- MoveSubscriptionsApiConfigLoader.getApiConfig[IO](appIdentity)
        .leftMap(error => MoveSubscriptionApiError(error.toString))
      routes <- createLogging()(SFMoveSubscriptionsApiRoutes(SFMoveSubscriptionsService(apiConfig)))
        .asRight[MoveSubscriptionApiError]
        .toEitherT[IO]
    } yield routes
  }

  private def createLogging(): HttpRoutes[IO] => HttpRoutes[IO] = {
    Logger.httpRoutes(
      logHeaders = true,
      logBody = true,
      redactHeadersWhen = { headerKey: CaseInsensitiveString => headerKey.value == "x-api-key" },
      logAction = Some({ message: String => IO.delay(logger.info(message)) })
    )
  }

}

object MoveSubscriptionsApiConfigLoader {

  def getApiConfig[F[_]: Sync](appIdentity: AppIdentity): EitherT[F, ConfigError, MoveSubscriptionApiConfig] = {
    for {
      rawConfig <- loadConfigFromPropertyStore[F](appIdentity)
      parsedCfg <- parseApiConfig(rawConfig)
    } yield parsedCfg
  }

  private def parseApiConfig[F[_]: Sync](rawConfig: Config): EitherT[F, ConfigError, MoveSubscriptionApiConfig] = {
    import io.circe.config.syntax._
    import io.circe.generic.auto._
    rawConfig
      .as[MoveSubscriptionApiConfig]
      .left.map(error => ConfigError(s"Failed to decode config: $error"))
      .toEitherT[F]
  }

  private def loadConfigFromPropertyStore[F[_]: Sync](appIdentity: AppIdentity): EitherT[F, ConfigError, Config] =
    EitherT(Sync[F].delay {
      Either.catchNonFatal {
        com.gu.conf.ConfigurationLoader.load(appIdentity) {
          case identity: AwsIdentity => SSMConfigurationLocation.default(identity)
          case DevIdentity(myApp) => ResourceConfigurationLocation(s"${myApp}-secret-dev.conf")
        }
      }.left.map(ex => ConfigError(s"Failed to load config: ${ex.getMessage}"))
    })
}
