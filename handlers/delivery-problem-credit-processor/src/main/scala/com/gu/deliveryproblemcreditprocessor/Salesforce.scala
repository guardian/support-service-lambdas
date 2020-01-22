package com.gu.deliveryproblemcreditprocessor

import zio.Task

trait Salesforce {
  val salesforce: Salesforce.Service
}

object Salesforce {
  trait Service {
    val requests: Task[DeliveryCreditRequest]
  }
}
