package com.gu.newproduct.api

import com.gu.effects.sqs.AwsSQSSend.QueueName
import com.gu.util.config.Stage

case class EmailQueueNames(contributions: QueueName, paper: QueueName, digipack: QueueName)

object EmailQueueNames {
  val defaultDevQueue = QueueName("subs-welcome-email-dev")
  val defaultProdQueue = QueueName("subs-welcome-email")

  def emailQueuesFor(stage: Stage) = stage match {

    case Stage("PROD") | Stage("CODE") => EmailQueueNames(
      contributions = QueueName("contributions-thanks"),
      paper = defaultProdQueue,
      digipack = defaultProdQueue
    )

    case _ => EmailQueueNames(
      contributions = QueueName("contributions-thanks-dev"),
      paper = defaultDevQueue,
      digipack = defaultDevQueue
    )
  }
}
