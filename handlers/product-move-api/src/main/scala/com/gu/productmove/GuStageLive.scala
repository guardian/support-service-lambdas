package com.gu.productmove

import zio.{ZIO, ZLayer}

object GuStageLive {
  enum Stage:
    case PROD, CODE, DEV

  val layer: ZLayer[Any, String, Stage] = {
    val stageZIO: ZIO[Any, Throwable, Stage] = for {
      stageString <- ZIO.attempt(sys.env.getOrElse("Stage", "DEV"))
      stage <- ZIO.attempt(Stage.valueOf(stageString))
    } yield stage
    ZLayer.fromZIO(stageZIO.mapError(_.toString))
  }
}
