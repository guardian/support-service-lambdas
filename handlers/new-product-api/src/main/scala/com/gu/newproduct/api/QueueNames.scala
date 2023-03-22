package com.gu.newproduct.api

import com.gu.effects.sqs.AwsSQSSend.QueueName
import com.gu.util.config.Stage

object EmailQueueNames {
  val commsQueueProd = QueueName("braze-emails-PROD")
  val commsQueueCode = QueueName("braze-emails-CODE")

  def emailQueueFor(stage: Stage) = stage match {
    case Stage("PROD") => commsQueueProd
    case _ => commsQueueCode
  }
}
