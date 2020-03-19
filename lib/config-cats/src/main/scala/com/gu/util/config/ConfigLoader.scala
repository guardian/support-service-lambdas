package com.gu.util.config

import cats.data.EitherT
import cats.implicits._
import cats.effect.Sync
import com.gu.conf.{ResourceConfigurationLocation, SSMConfigurationLocation}
import com.gu.{AppIdentity, AwsIdentity, DevIdentity}
import com.typesafe.config.Config
import io.circe.Decoder
import io.circe.config.syntax._

case class ConfigError(message: String)

object ConfigLoader {
  def loadConfig[F[_]: Sync, A: Decoder](appIdentity: AppIdentity): EitherT[F, ConfigError, A] = {
    for {
      typeSafeConfig <- loadConfigFromPropertyStore[F](appIdentity)
      parsedConfig <- typeSafeConfig
        .as[A]
        .left.map(error => ConfigError(s"Failed to decode config: $error"))
        .toEitherT[F]
    } yield parsedConfig
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
