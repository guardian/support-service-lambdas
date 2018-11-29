package com.gu.steps

import play.api.libs.json.{JsValue, _}

sealed trait InterpJson[STEP <: StepsAlg] {
  type FINAL
  def run(step: STEP): (List[JsValue => Option[JsValue]], JsValue => Option[FINAL])
}
object InterpJson {

  def apply[FROM: Writes] = new {
    def apply[REST <: StepsAlg](
      steps: REST
    )(implicit canRun: InterpJson[REST]): CompiledSteps[FROM, canRun.FINAL] = {
      val (runs, finalReads) = canRun.run(steps)

      val fromString = { value: FROM => Json.toJson(value) }

      CompiledSteps(fromString, runs, finalReads)

    }
  }

  implicit def canRunEndStepJson[FROM: Reads, FINAL1: OFormat]: InterpJson[EndStep[FROM, FINAL1]] =
    new InterpJson[EndStep[FROM, FINAL1]] {
      override type FINAL = FINAL1

      override def run(step: EndStep[FROM, FINAL1]): (List[JsValue => Option[JsValue]], JsValue => Option[FINAL1]) = {
        val fn: JsValue => Option[JsValue] = { fromRaw: JsValue =>
          fromRaw.validate[FROM].asOpt.map { from =>
            val final1 = step.lambda(from)
            Json.toJson(final1)
          }

        }
        (List(fn), { s: JsValue => s.validate[FINAL].asOpt })
      }

    }

  implicit def canRunTaskStepJson[FROM: Reads, TO: Writes, REST <: StepsAlg](
    implicit
    canRunRest: InterpJson[REST]
  ): InterpJson[TaskStep[FROM, TO, REST]] =
    new InterpJson[TaskStep[FROM, TO, REST]] {
      override type FINAL = canRunRest.FINAL

      override def run(step: TaskStep[FROM, TO, REST]): (List[JsValue => Option[JsValue]], JsValue => Option[FINAL]) = {
        val fn: JsValue => Option[JsValue] = { fromRaw: JsValue =>
          fromRaw.validate[FROM].asOpt.map { from =>
            val final1 = step.lambda(from)
            Json.toJson(final1)
          }
        }
        val (restFunctions, readFinal) = canRunRest.run(step.rest)
        (fn :: restFunctions, readFinal)
      }

    }

  implicit def canRunWaitStepJson[REST <: StepsAlg](
    implicit
    canRunRest: InterpJson[REST]
  ): InterpJson[WaitStep[REST]] =
    new InterpJson[WaitStep[REST]] {
      override type FINAL = canRunRest.FINAL

      override def run(step: WaitStep[REST]): (List[JsValue => Option[JsValue]], JsValue => Option[FINAL]) = {
        canRunRest.run(step.rest) // FIXME actually remember we need a delay?
      }

    }

}
