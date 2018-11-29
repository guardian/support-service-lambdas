package com.gu.steps

sealed trait StepsAlg[FROM]

// prepend a task
case class EndStep[FROM, TO](lambda: FROM => TO) extends StepsAlg[FROM]

// prepend a task
case class TaskStep[FROM, TO, REST <: StepsAlg[TO]](
  lambda: FROM => TO,
  rest: REST
) extends StepsAlg[FROM]

//case class ParallelStep[FROM](
//  branches: List[Steps[FROM]], // HList?
//  end: Boolean
//) extends Steps[FROM]
//case class ChoiceStep[FROM](
//  variableAWS: String, // can quasiquote for this?
//  variableScala: FROM => Boolean,
//  next: Steps[FROM],
//  default: Steps[FROM]
//) extends Steps[FROM]

