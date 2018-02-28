package com.gu.effects

import com.gu.util.Stage
import okhttp3.{ Request, Response }
import java.time.LocalDate

import scala.util.Try

case class RawEffects(
  response: Request => Response,
  stage: Stage,
  s3Load: Stage => Try[String],
  now: () => LocalDate)

object RawEffects {

  // This is the effects that actually does stuff in side effects
  def createDefault = {
    val stage = Stage(System.getenv("Stage"))
    RawEffects(Http.response, stage, ConfigLoad.load, () => LocalDate.now)
  }

}
