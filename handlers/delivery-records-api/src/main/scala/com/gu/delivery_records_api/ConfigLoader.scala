package com.gu.delivery_records_api

import cats.data.EitherT
import cats.effect.Sync
import com.gu.effects.{GetFromS3, S3Location}
import com.gu.util.config.{ConfigLocation, Stage}
import io.circe.Decoder
import io.circe.parser.decode

case class ConfigError(message: String)

object ConfigLoader {
  def loadFileFromS3[F[_]: Sync, A: Decoder](
      bucket: String,
      stage: Stage,
      configLocation: ConfigLocation[A],
  ): EitherT[F, ConfigError, A] = {
    for {
      string <- getStringFromS3(getS3Location(bucket, stage, configLocation))
      decoded <- decodeString(string)
    } yield decoded
  }

  private def decodeString[F[_]: Sync, A: Decoder](string: String) = {
    EitherT.fromEither[F](decode[A](string).left.map(error => ConfigError(s"$error")))
  }

  private def getStringFromS3[F[_]: Sync, A: Decoder](s3Location: S3Location): EitherT[F, ConfigError, String] = {
    EitherT(
      Sync[F].delay(
        GetFromS3
          .fetchString(S3Location(s3Location.bucket, s3Location.key))
          .toEither
          .left
          .map(ex => ConfigError(ex.toString)),
      ),
    )
  }

  private def getS3Location[A](bucket: String, stage: Stage, configLocation: ConfigLocation[A]): S3Location = {
    S3Location(
      bucket = bucket,
      key = configLocation.toPath(stage),
    )
  }
}
