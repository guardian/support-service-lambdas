package com.gu.util.zuora

import com.gu.util.resthttp.RestRequestMaker.Requests
import com.gu.util.resthttp.Types.ClientFailableOp
import play.api.libs.json.{JsArray, JsValue}

final case class SubscriptionNumberWithStatus(number: String, status: String)

trait GetAccountSubscriptions {
  def getAccountSubscriptions(accountId: String): ClientFailableOp[List[SubscriptionNumberWithStatus]]
}

class ZuoraGetAccountSubscriptions(requests: Requests) extends GetAccountSubscriptions {
  // pageSize by default is 20
  // TODO setting here to 40, consider changing that value in the future

  override def getAccountSubscriptions(accountId: String): ClientFailableOp[List[SubscriptionNumberWithStatus]] = {
    requests.get[JsValue](s"subscriptions/accounts/$accountId?pageSize=40").map { topJson =>
      val jsonArr = (topJson \ "subscriptions").as[JsArray]
      val accSubs = jsonArr.value.map { json =>
        val subNum = (json \ "subscriptionNumber").as[String]
        val subStatus = (json \ "status").as[String]
        SubscriptionNumberWithStatus(subNum, subStatus)
      }.toList
      accSubs
    }
  }
}
