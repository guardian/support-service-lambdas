package com.gu.productmove

import zio.{Layer, System, Task, ZIO, ZLayer}

object GuStageLive {
  enum Stage:
    case PROD, CODE, DEV

  val layer: Layer[String, Stage] =
    ZLayer {
      for {
        stageString <- System.envOrElse("Stage", "DEV")
        stage <- ZIO.attempt(Stage.valueOf(stageString))
      } yield stage
    }.mapError(_.toString)

}
