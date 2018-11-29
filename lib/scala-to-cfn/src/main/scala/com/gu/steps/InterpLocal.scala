package com.gu.steps

trait InterpLocal[FROM, STEP <: StepsAlg[FROM]] {
  type FINAL
  def run(step: STEP, from: FROM): FINAL
}
object InterpLocal {

  def apply[FROM, REST <: StepsAlg[FROM]](
    input: FROM,
    steps: REST
  )(implicit canRun: InterpLocal[FROM, REST]): canRun.FINAL =
    canRun.run(steps, input)

  implicit def canRunEndStep[FROM, FINAL1]: InterpLocal[FROM, EndStep[FROM, FINAL1]] =
    new InterpLocal[FROM, EndStep[FROM, FINAL1]] {
      override type FINAL = FINAL1

      override def run(step: EndStep[FROM, FINAL1], from: FROM): FINAL1 =
        step.lambda(from)

    }

  implicit def canRunTaskStep[FROM, TO, REST <: StepsAlg[TO]](
    implicit
    canRunRest: InterpLocal[TO, REST]
  ): InterpLocal[FROM, TaskStep[FROM, TO, REST]] =
    new InterpLocal[FROM, TaskStep[FROM, TO, REST]] {
      override type FINAL = canRunRest.FINAL

      override def run(step: TaskStep[FROM, TO, REST], from: FROM): FINAL = {
        canRunRest.run(step.rest, step.lambda(from))
      }

    }

}
