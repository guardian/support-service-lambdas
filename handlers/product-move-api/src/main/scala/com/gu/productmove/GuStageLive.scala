package com.gu.productmove

import zio.{ZIO, ZLayer, System}

object GuStageLive {
  enum Stage:
    case PROD, CODE, DEV

  val layer: ZLayer[Any, String, Stage] = {
    val stageZIO: ZIO[Any, Throwable, Stage] = for {
      stageString <- System.envOrElse("Stage", "DEV")
      stage <- ZIO.attempt(Stage.valueOf(stageString))
    } yield stage
    ZLayer.fromZIO(stageZIO.mapError(_.toString))
  }
}
