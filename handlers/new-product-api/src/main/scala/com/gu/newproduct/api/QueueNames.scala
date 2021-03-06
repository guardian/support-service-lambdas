package com.gu.newproduct.api

import com.gu.effects.sqs.AwsSQSSend.QueueName
import com.gu.util.config.Stage

case class EmailQueueNames(contributions: QueueName, paper: QueueName, digipack: QueueName, guardianWeekly: QueueName)

object EmailQueueNames {
  val subsWelcomeDevQueue = QueueName("subs-welcome-email-dev")
  val subsWelcomeProdQueue = QueueName("subs-welcome-email")
  val contributionThanksProdQueue = QueueName("contributions-thanks")
  val contributionThanksDevQueue = QueueName("contributions-thanks-dev")

  def emailQueuesFor(stage: Stage) = stage match {

    case Stage("PROD") =>
      EmailQueueNames(
        contributions = contributionThanksProdQueue,
        paper = subsWelcomeProdQueue,
        digipack = subsWelcomeProdQueue,
        guardianWeekly = contributionThanksProdQueue
      )

    case _ =>
      EmailQueueNames(
        contributions = contributionThanksDevQueue,
        paper = subsWelcomeDevQueue,
        digipack = subsWelcomeDevQueue,
        guardianWeekly = contributionThanksDevQueue
      )
  }
}
