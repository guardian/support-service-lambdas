package com.gu.digital_voucher_api

import cats.data.EitherT
import cats.implicits._
import cats.effect.Sync
import com.gu.conf.{ResourceConfigurationLocation, SSMConfigurationLocation}
import com.gu.{AppIdentity, AwsIdentity, DevIdentity}
import com.typesafe.config.Config
import io.circe.generic.auto._
import io.circe.config.syntax._

case class DigitalVoucherApiConfig(imovoBaseUrl: String, imovoApiKey: String)

case class ConfigError(message: String)

object ConfigLoader {
  def loadConfig[F[_]: Sync](): EitherT[F, ConfigError, DigitalVoucherApiConfig] = {
    for {
      typeSafeConfig <- loadConfigFromPropertyStore[F]()
      parsedConfig <- typeSafeConfig
        .as[DigitalVoucherApiConfig]
        .leftMap(error => ConfigError(s"Failed to decode config: $error"))
        .toEitherT[F]
    } yield parsedConfig
  }

  private def loadConfigFromPropertyStore[F[_]: Sync](): EitherT[F, ConfigError, Config] =
    EitherT(Sync[F].delay {
      Either.catchNonFatal {
        val identity = AppIdentity.whoAmI(defaultAppName = "digital-voucher-api")
        com.gu.conf.ConfigurationLoader.load(identity) {
          case identity: AwsIdentity => SSMConfigurationLocation.default(identity)
          case DevIdentity(myApp) => ResourceConfigurationLocation(s"${myApp}-secret-dev.conf")
        }
      }.leftMap(ex => ConfigError(s"Failed to load config: ${ex.getMessage}"))
    })
}
