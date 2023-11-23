package com.gu.productmove

import zio.{Layer, System, Task, ZIO, ZLayer}

object GuStageLive {
  enum Stage:
    case PROD, CODE

  val layer: Layer[Throwable, Stage] =
    ZLayer {
      for {
        stageString <- System.envOrElse("Stage", "CODE")
        stage <- ZIO.attempt(Stage.valueOf(stageString))
      } yield stage
    }

}
