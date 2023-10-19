package com.gu.paperround.client

import com.gu.newproduct.api.addsubscription.DeliveryAgent
import com.gu.paperround.client.GetAgents.DeliveryAgentRecord
import com.gu.util.resthttp.Types.ClientFailableOp
import play.api.libs.json.{Json, Reads}

trait GetAgents {

  def getAgents(): ClientFailableOp[List[DeliveryAgentRecord]]
  
}
class GetAgentsImpl(formRequestMaker: FormRequestMaker) extends GetAgents {

  import GetAgents._

  def getAgents(): ClientFailableOp[List[DeliveryAgentRecord]] =
    for {
      wireResponse <- formRequestMaker.post[WireResponse](Map(), "/agents")
    } yield
      wireResponse.data.agents.map { agent =>
        import agent._
        DeliveryAgentRecord(
          DeliveryAgent(refid.toString),
          agentname,
          telephone,
          town,
          postcode,
          address2,
          email,
          address1,
          county
        )
      }

}

object GetAgents {

  def apply(formRequestMaker: FormRequestMaker): GetAgents = new GetAgentsImpl(formRequestMaker)

  private[client] implicit val agentReads: Reads[WireResponseAgent] = Json.reads

  private[client] case class WireResponseAgent(
    telephone: String,
    town: String,
    postcode: String,
    address2: String,
    email: String,
//    enddate: LocalDate,//": "2100-01-01",
//    startdate: LocalDate,//": "2022-01-01",
    address1: String,
    agentname: String,
    refid: Int,
    county: String,
//    refgroupid: Int,
  )

  private[client] implicit val responseDataReads: Reads[WireResponseData] = Json.reads

  private[client] case class WireResponseData(
      agents: List[WireResponseAgent],
  )

  private[client] implicit val responseReads: Reads[WireResponse] = Json.reads

  private[client] case class WireResponse(
      //    status_code: Int,
      data: WireResponseData,
      //    message: String,
  )

  case class DeliveryAgentRecord(
    deliveryAgent: DeliveryAgent,
    agentName: String,
    telephone: String,
    town: String,
    postcode: String,
    address2: String,
    email: String,
    address1: String,
    county: String,
  )

}
