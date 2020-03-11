package com.gu.sf.move.subscriptions.api

import cats.data.EitherT
import cats.effect.Sync
import cats.implicits._
import com.gu.conf.{ResourceConfigurationLocation, SSMConfigurationLocation}
import com.gu.{AppIdentity, AwsIdentity, DevIdentity}
import com.typesafe.config.Config

final case class ConfigError(error: String)

object ConfigLoader {

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
