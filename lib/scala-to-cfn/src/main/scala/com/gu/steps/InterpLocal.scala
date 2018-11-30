package com.gu.steps

trait InterpLocal[FROM, STEP <: StepsAlg] {
  type FINAL
  def run(step: STEP, from: FROM): FINAL
}
object InterpLocal {

  def apply[FROM, REST <: StepsAlg](
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

  implicit def canRunTaskStep[FROM, TO, REST <: StepsAlg](
    implicit
    canRunRest: InterpLocal[TO, REST]
  ): InterpLocal[FROM, TaskStep[FROM, TO, REST]] =
    new InterpLocal[FROM, TaskStep[FROM, TO, REST]] {
      override type FINAL = canRunRest.FINAL

      override def run(step: TaskStep[FROM, TO, REST], from: FROM): FINAL = {
        canRunRest.run(step.rest, step.lambda(from))
      }

    }

  implicit def canRunWaitState[IOTYPE, REST <: StepsAlg](
    implicit
    canRunRest: InterpLocal[IOTYPE, REST]
  ): InterpLocal[IOTYPE, WaitStep[REST]] =
    new InterpLocal[IOTYPE, WaitStep[REST]] {
      override type FINAL = canRunRest.FINAL

      override def run(step: WaitStep[REST], from: IOTYPE): FINAL = {
        Thread.sleep(step.time.value.toLong * 1000L)
        canRunRest.run(step.rest, from)
      }

    }

}
