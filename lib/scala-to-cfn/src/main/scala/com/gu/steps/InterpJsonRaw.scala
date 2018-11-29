package com.gu.steps

import play.api.libs.json.{JsValue, Json, Reads, Writes}

trait InterpJsonRaw[STEP <: StepsAlg[_]] {
  def run(step: STEP): List[JsValue => Option[JsValue]]
}
object InterpJsonRaw {

  def apply[REST <: StepsAlg[_]](steps: REST)(implicit canRun: InterpJsonRaw[REST]) = {
    val runs = canRun.run(steps)

    { value: JsValue =>
      runs.foldLeft[Option[JsValue]](Some(value)) {
        case (str, nextStep) =>
          str.flatMap(nextStep)
      }
    }
  }

  implicit def canRunEndStepJson[FROM: Reads, FINAL: Writes]: InterpJsonRaw[EndStep[FROM, FINAL]] =
    new InterpJsonRaw[EndStep[FROM, FINAL]] {

      override def run(step: EndStep[FROM, FINAL]): List[JsValue => Option[JsValue]] = {
        val fn: JsValue => Option[JsValue] = { fromRaw: JsValue =>
          fromRaw.validate[FROM].asOpt.map { from =>
            val final1 = step.lambda(from)
            Json.toJson(final1)
          }

        }
        List(fn)
      }

    }

  implicit def canRunTaskStepJson[FROM: Reads, TO: Writes, REST <: StepsAlg[TO]](
    implicit
    canRunRest: InterpJsonRaw[REST]
  ): InterpJsonRaw[TaskStep[FROM, TO, REST]] =
    new InterpJsonRaw[TaskStep[FROM, TO, REST]] {

      override def run(step: TaskStep[FROM, TO, REST]): List[JsValue => Option[JsValue]] = {
        val fn: JsValue => Option[JsValue] = { fromRaw: JsValue =>
          fromRaw.validate[FROM].asOpt.map { from =>
            val final1 = step.lambda(from)
            Json.toJson(final1)
          }

        }
        fn :: canRunRest.run(step.rest)
      }

    }

}
