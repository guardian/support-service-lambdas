package com.gu.steps

sealed trait StepsAlg {
  type FROM
}

// prepend a task
case class EndStep[FROM1, TO](lambda: FROM1 => TO) extends StepsAlg {
  override type FROM = FROM1
}

// prepend a task
case class TaskStep[FROM1, TO, REST <: StepsAlg](
  lambda: FROM1 => TO,
  rest: REST
) extends StepsAlg {
  override type FROM = FROM1
}

//case class ChoiceStep[FROM](
//  variableAWS: String, // can quasiquote for this?
//  variableScala: FROM => Boolean,
//  next: Steps[FROM],
//  default: Steps[FROM]
//) extends Steps[FROM]
case class WaitStep[REST <: StepsAlg](
  time: Time,
  rest: REST
) extends StepsAlg {
  override type FROM = rest.FROM
}
case class Time(value: Int) extends AnyVal

//case class ParallelStep[FROM](
//  branches: List[Steps[FROM]], // HList?
//  end: Boolean
//) extends Steps[FROM]
