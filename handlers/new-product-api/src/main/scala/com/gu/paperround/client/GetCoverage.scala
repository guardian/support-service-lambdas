package com.gu.paperround.client

import com.gu.newproduct.api.addsubscription.DeliveryAgent
import com.gu.util.resthttp.Types.{ClientFailableOp, ClientSuccess, GenericError}
import play.api.libs.json.{Json, Reads}

class GetCoverage(formRequestMaker: FormRequestMaker) {

  import GetCoverage._

  def getCoverage(postcode: String): ClientFailableOp[List[DeliveryAgent]] =
    for {
      wireResponse <- formRequestMaker.post[WireResponse](Map("postcode" -> postcode), "/coverage")
      _ <- if (List("CO", "NC").contains(wireResponse.data.status)) ClientSuccess(()) else GenericError("invalid status")
    } yield
      wireResponse.data.agents.map { agent =>
        DeliveryAgent(agent.agentid.toString)
      }

}

object GetCoverage {

  private implicit val agentReads: Reads[WireResponseAgent] = Json.reads

  private case class WireResponseAgent(
//    deliverymethod: String,
//    postcode: String,
      agentid: Int,
//    nbrdeliverydays: Int,
//    summary: String,
//    agentname: String,
//    refgroupid: Int,
  )

  private implicit val responseDataReads: Reads[WireResponseData] = Json.reads

  private case class WireResponseData(
      //    message: String,
      status: String,
      agents: List[WireResponseAgent],
  )

  private implicit val responseReads: Reads[WireResponse] = Json.reads

  private case class WireResponse(
      //    status_code: Int,
      data: WireResponseData,
      //    message: String,
  )

}
